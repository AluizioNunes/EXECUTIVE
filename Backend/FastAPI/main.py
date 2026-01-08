import os
import re
import json
import time
import hmac
import base64
import hashlib
import urllib.parse
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Column, Date, Integer, MetaData, Numeric, String, create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.schema import ForeignKeyConstraint
from sqlalchemy.sql import quoted_name


def _database_url() -> str:
    raw = os.getenv("DATABASE_URL")
    if not raw or not str(raw).strip():
        user = str(os.getenv("POSTGRES_USER") or "postgres").strip() or "postgres"
        password = str(os.getenv("POSTGRES_PASSWORD") or "postgres")
        db = str(os.getenv("POSTGRES_DB") or "executive").strip() or "executive"
        host = str(os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST") or "127.0.0.1").strip() or "127.0.0.1"
        port = str(os.getenv("POSTGRES_PORT") or os.getenv("DB_PORT") or "5432").strip() or "5432"
        password_enc = urllib.parse.quote_plus(password)
        return f"postgresql+psycopg://{user}:{password_enc}@{host}:{port}/{db}"
    raw = str(raw).strip()
    if raw.startswith("sqlite:"):
        raise RuntimeError("SQLite não é suportado (PostgreSQL obrigatório)")
    if not raw.startswith("postgresql"):
        raise RuntimeError("Somente PostgreSQL é suportado")
    return raw

def _connect_args(url: str) -> dict[str, Any]:
    if not url.startswith("postgresql"):
        raise RuntimeError("Somente PostgreSQL é suportado")
    try:
        parsed = make_url(url)
        if str(parsed.query.get("options") or "").strip():
            return {}
    except Exception:
        pass
    schema = os.getenv("DB_SCHEMA") or "EXECUTIVE"
    return {"options": f'-csearch_path="{schema}"'}


DATABASE_URL = _database_url()
engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args(DATABASE_URL),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
SCHEMA_NAME = os.getenv("DB_SCHEMA") or "EXECUTIVE"
SCHEMA_TABLE_ARGS = {"schema": SCHEMA_NAME}
TENANTS_TABLE_NAME = quoted_name("Tenants", True)


class Base(DeclarativeBase):
    pass


class ExecutivoModel(Base):
    __tablename__ = "Executivos"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdExecutivo = Column("IdExecutivo", Integer, primary_key=True, autoincrement=True, index=True)
    Executivo = Column("Executivo", String(255), nullable=False)
    Funcao = Column("Funcao", String(255), nullable=False)
    Perfil = Column("Perfil", String(255), nullable=False)
    Empresa = Column("Empresa", String(255), nullable=False)


class ContasPagarModel(Base):
    __tablename__ = "ContasPagar"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdContasPagar = Column("IdContasPagar", Integer, primary_key=True, autoincrement=True, index=True)

    Descricao = Column("Descricao", String(255), nullable=False)
    TipoCobranca = Column("TipoCobranca", String(255), nullable=True)
    IdCobranca = Column("IdCobranca", String(255), nullable=True)
    TagCobranca = Column("TagCobranca", String(255), nullable=True)
    Credor = Column("Credor", String(255), nullable=True)
    TipoCredor = Column("TipoCredor", String(255), nullable=True)
    ValorOriginal = Column("ValorOriginal", Numeric(14, 2), nullable=True)
    TipoPagamento = Column("TipoPagamento", String(30), nullable=True)
    Parcelas = Column("Parcelas", Integer, nullable=True)
    Desconto = Column("Desconto", Numeric(14, 2), nullable=True)
    Acrescimo = Column("Acrescimo", Numeric(14, 2), nullable=True)
    ValorFinal = Column("ValorFinal", Numeric(14, 2), nullable=True)
    DevedorIdExecutivo = Column("DevedorIdExecutivo", Integer, nullable=True)
    Devedor = Column("Devedor", String(255), nullable=True)
    StatusPagamento = Column("StatusPagamento", String(50), nullable=True)
    StatusCobranca = Column("StatusCobranca", String(50), nullable=True)
    Vencimento = Column("Vencimento", Date, nullable=True)
    DocumentoPath = Column("DocumentoPath", String(1000), nullable=True)
    URLCobranca = Column("URLCobranca", String(1000), nullable=True)
    Usuario = Column("Usuario", String(255), nullable=True)
    Senha = Column("Senha", String(255), nullable=True)
    Empresa = Column("Empresa", String(255), nullable=True)


class AtivoModel(Base):
    __tablename__ = "Ativos"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdAtivo = Column("IdAtivo", Integer, primary_key=True, autoincrement=True, index=True)
    Ativo = Column("Ativo", String(255), nullable=False)
    CodigoInternoAtivo = Column("CodigoInternoAtivo", String(255), nullable=True)
    Placa = Column("Placa", String(50), nullable=True)
    Cidade = Column("Cidade", String(255), nullable=True)
    UF = Column("UF", String(2), nullable=True)
    CentroCusto = Column("CentroCusto", String(255), nullable=True)
    Proprietario = Column("Proprietario", String(255), nullable=True)
    Responsavel = Column("Responsavel", String(255), nullable=True)
    Atribuido = Column("Atribuido", String(255), nullable=True)
    Empresa = Column("Empresa", String(255), nullable=True)


class CentroCustosModel(Base):
    __tablename__ = "CentroCustos"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdCustos = Column("IdCustos", Integer, primary_key=True, autoincrement=True, index=True)
    CodigoInterno = Column("CodigoInterno", String(255), nullable=True)
    Classe = Column("Classe", String(255), nullable=True)
    Nome = Column("Nome", String(255), nullable=False)
    Cidade = Column("Cidade", String(255), nullable=True)
    UF = Column("UF", String(2), nullable=True)
    Empresa = Column("Empresa", String(255), nullable=False)
    Departamento = Column("Departamento", String(255), nullable=True)
    Responsavel = Column("Responsavel", String(255), nullable=True)


class TenantsModel(Base):
    __tablename__ = TENANTS_TABLE_NAME
    __table_args__ = SCHEMA_TABLE_ARGS

    IdTenant = Column("IdTenant", Integer, primary_key=True, autoincrement=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=False)
    Slug = Column("Slug", String(255), nullable=False, unique=True, index=True)
    DataCriacao = Column("DataCriacao", Date, nullable=False, default=date.today)
    DataUpdate = Column("DataUpdate", Date, nullable=False, default=date.today)
    Cadastrante = Column("Cadastrante", String(255), nullable=True)


class UsuariosModel(Base):
    __tablename__ = "Usuarios"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdUsuario = Column("IdUsuarios", Integer, primary_key=True, autoincrement=True, index=True)
    Usuario = Column("Usuario", String(255), nullable=False, unique=True, index=True)
    TenantId = Column("TenantId", Integer, nullable=False, index=True)
    Role = Column("Role", String(50), nullable=False)
    Nome = Column("Nome", String(255), nullable=True)
    Funcao = Column("Funcao", String(255), nullable=True)
    Perfil = Column("Perfil", String(255), nullable=True)
    Permissao = Column("Permissao", String(255), nullable=True)
    Celular = Column("Celular", String(30), nullable=True)
    Email = Column("Email", String(255), nullable=True)
    SenhaSalt = Column("SenhaSalt", String(64), nullable=False)
    SenhaHash = Column("SenhaHash", String(128), nullable=False)
    Ativo = Column("Ativo", Integer, nullable=False, default=1)


def _drop_legacy_tenant_table() -> None:
    try:
        with engine.connect() as conn:
            for schema in (SCHEMA_NAME, "public"):
                conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{schema}"."tenant" CASCADE')
            conn.commit()
    except Exception:
        return


_drop_legacy_tenant_table()

def _ensure_postgres_tenants_table_name() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.connect() as conn:
            names = conn.execute(
                text("select table_name from information_schema.tables where table_schema=:s"),
                {"s": SCHEMA_NAME},
            ).fetchall()
            existing = {str(r[0]) for r in names}

            if "tenant" in existing:
                conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{SCHEMA_NAME}"."tenant" CASCADE')

            if "tenants" in existing and "Tenants" not in existing:
                conn.exec_driver_sql(f'ALTER TABLE "{SCHEMA_NAME}".tenants RENAME TO "Tenants"')

            conn.commit()
    except Exception:
        return


_ensure_postgres_tenants_table_name()

Base.metadata.create_all(bind=engine)

def _seed_reset_postgres_sequence(*, table: str, column: str) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    f"""
                    select setval(
                        pg_get_serial_sequence('"{SCHEMA_NAME}"."{table}"', '{column}'),
                        (select coalesce(max("{column}"), 1) from "{SCHEMA_NAME}"."{table}"),
                        true
                    )
                    """
                )
            )
            conn.commit()
    except Exception:
        return


def _ensure_default_tenant_executive() -> None:
    try:
        with SessionLocal() as db:
            today = date.today()
            existing_slug = db.execute(select(TenantsModel).where(TenantsModel.Slug == "executive")).scalar_one_or_none()
            existing_id1 = db.get(TenantsModel, 1)

            if existing_id1 and existing_id1.Slug != "executive":
                if existing_slug and existing_slug.IdTenant != 1:
                    db.delete(existing_slug)
                    db.commit()
                existing_id1.Tenant = "EXECUTIVE"
                existing_id1.Slug = "executive"
                existing_id1.DataCriacao = existing_id1.DataCriacao or today
                existing_id1.DataUpdate = today
                if not existing_id1.Cadastrante:
                    existing_id1.Cadastrante = "SYSTEM"
                db.commit()
                db.refresh(existing_id1)
                _seed_reset_postgres_sequence(table="Tenants", column="IdTenant")
                return

            if existing_id1 and existing_id1.Slug == "executive":
                existing_id1.Tenant = "EXECUTIVE"
                existing_id1.DataCriacao = existing_id1.DataCriacao or today
                existing_id1.DataUpdate = today
                if not existing_id1.Cadastrante:
                    existing_id1.Cadastrante = "SYSTEM"
                db.commit()
                _seed_reset_postgres_sequence(table="Tenants", column="IdTenant")
                return

            if existing_slug and existing_slug.IdTenant != 1:
                existing_slug.Tenant = "EXECUTIVE"
                existing_slug.DataCriacao = existing_slug.DataCriacao or today
                existing_slug.DataUpdate = today
                if not existing_slug.Cadastrante:
                    existing_slug.Cadastrante = "SYSTEM"
                db.commit()
                _seed_reset_postgres_sequence(table="Tenants", column="IdTenant")
                return

            row = TenantsModel(
                IdTenant=1,
                Tenant="EXECUTIVE",
                Slug="executive",
                DataCriacao=today,
                DataUpdate=today,
                Cadastrante="SYSTEM",
            )
            db.add(row)
            db.commit()
            _seed_reset_postgres_sequence(table="Tenants", column="IdTenant")
    except Exception:
        return


def _pbkdf2_hash_password(password: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return dk.hex()


def _ensure_default_admin_user() -> None:
    try:
        with SessionLocal() as db:
            tenant = db.execute(select(TenantsModel).where(TenantsModel.Slug == "executive")).scalar_one_or_none()
            tenant_id = int(tenant.IdTenant) if tenant else 1
            existing_en = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == "ADMINISTRATOR")).scalar_one_or_none()
            if existing_en:
                db.delete(existing_en)
                db.commit()

            existing = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == "ADMINISTRADOR")).scalar_one_or_none()
            salt_hex = os.urandom(16).hex()
            senha_hash = _pbkdf2_hash_password("admin", salt_hex)
            if existing:
                existing.TenantId = tenant_id
                existing.Role = "SUPERADMIN"
                existing.Nome = existing.Nome or "ADMINISTRADOR"
                existing.SenhaSalt = salt_hex
                existing.SenhaHash = senha_hash
                existing.Ativo = 1
                db.commit()
                _seed_reset_postgres_sequence(table="Usuarios", column="IdUsuario")
                return

            row = UsuariosModel(
                Usuario="ADMINISTRADOR",
                TenantId=tenant_id,
                Role="SUPERADMIN",
                Nome="ADMINISTRADOR",
                SenhaSalt=salt_hex,
                SenhaHash=senha_hash,
                Ativo=1,
            )
            db.add(row)
            db.commit()
            _seed_reset_postgres_sequence(table="Usuarios", column="IdUsuario")
    except Exception:
        return


def _ensure_ativos_empresa_column() -> None:
    try:
        with engine.connect() as conn:
            exists = conn.execute(
                text(
                    "select 1 from information_schema.columns where table_schema=:s and table_name=:t and column_name=:c"
                ),
                {"s": SCHEMA_NAME, "t": "Ativos", "c": "Empresa"},
            ).first()
            if not exists:
                conn.execute(text(f'ALTER TABLE "{SCHEMA_NAME}"."Ativos" ADD COLUMN "Empresa" VARCHAR(255)'))
                conn.commit()
    except Exception:
        return


def _ensure_usuarios_columns() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.connect() as conn:
            existing_rows = conn.execute(
                text("select column_name from information_schema.columns where table_schema=:s and table_name=:t"),
                {"s": SCHEMA_NAME, "t": "Usuarios"},
            ).fetchall()
            existing = {str(r[0]) for r in existing_rows}

            statements: list[str] = []
            if "Usuario" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Usuario" VARCHAR(255)')
            if "TenantId" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "TenantId" INTEGER')
            if "Role" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Role" VARCHAR(50)')
            if "Nome" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Nome" VARCHAR(255)')
            if "Funcao" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Funcao" VARCHAR(255)')
            if "Perfil" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Perfil" VARCHAR(255)')
            if "Permissao" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Permissao" VARCHAR(255)')
            if "Celular" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Celular" VARCHAR(30)')
            if "Email" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Email" VARCHAR(255)')
            if "SenhaSalt" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "SenhaSalt" VARCHAR(64)')
            if "SenhaHash" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "SenhaHash" VARCHAR(128)')
            if "Ativo" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" ADD COLUMN "Ativo" INTEGER NOT NULL DEFAULT 1')

            for stmt in statements:
                conn.exec_driver_sql(stmt)
            if statements:
                conn.commit()
    except Exception:
        return


def _ensure_usuarios_nome_column_position() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    select column_name, ordinal_position
                    from information_schema.columns
                    where table_schema=:s and table_name=:t
                    order by ordinal_position asc
                    """
                ),
                {"s": SCHEMA_NAME, "t": "Usuarios"},
            ).fetchall()
            positions = {str(r[0]): int(r[1]) for r in rows if r and r[0]}

            if "IdUsuarios" not in positions or "Nome" not in positions:
                return
            if int(positions["Nome"]) == 2:
                return

            conn.exec_driver_sql(f'ALTER TABLE "{SCHEMA_NAME}"."Usuarios" RENAME TO "Usuarios__old_nome_order"')
            conn.exec_driver_sql(
                f"""
                CREATE TABLE "{SCHEMA_NAME}"."Usuarios" (
                    "IdUsuarios" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "Nome" VARCHAR(255) NULL,
                    "Usuario" VARCHAR(255) NOT NULL,
                    "TenantId" INTEGER NOT NULL,
                    "Role" VARCHAR(50) NOT NULL,
                    "Funcao" VARCHAR(255) NULL,
                    "Perfil" VARCHAR(255) NULL,
                    "Permissao" VARCHAR(255) NULL,
                    "Celular" VARCHAR(30) NULL,
                    "Email" VARCHAR(255) NULL,
                    "SenhaSalt" VARCHAR(64) NOT NULL,
                    "SenhaHash" VARCHAR(128) NOT NULL,
                    "Ativo" INTEGER NOT NULL DEFAULT 1,
                    CONSTRAINT "uq_Usuarios_Usuario" UNIQUE ("Usuario")
                )
                """
            )
            conn.exec_driver_sql(
                f"""
                INSERT INTO "{SCHEMA_NAME}"."Usuarios"
                    ("IdUsuarios","Nome","Usuario","TenantId","Role","Funcao","Perfil","Permissao","Celular","Email","SenhaSalt","SenhaHash","Ativo")
                SELECT
                    "IdUsuarios","Nome","Usuario","TenantId","Role","Funcao","Perfil","Permissao","Celular","Email","SenhaSalt","SenhaHash","Ativo"
                FROM "{SCHEMA_NAME}"."Usuarios__old_nome_order"
                """
            )
            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_Usuarios_TenantId" ON "{SCHEMA_NAME}"."Usuarios" ("TenantId")')
            conn.exec_driver_sql(f'DROP TABLE "{SCHEMA_NAME}"."Usuarios__old_nome_order"')
            conn.commit()
    except Exception:
        return


_ensure_ativos_empresa_column()
_ensure_usuarios_columns()
_ensure_usuarios_nome_column_position()
_ensure_default_tenant_executive()
_ensure_default_admin_user()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ExecutivoCreate(BaseModel):
    Executivo: str = Field(min_length=1, max_length=255)
    Funcao: str = Field(min_length=1, max_length=255)
    Perfil: str = Field(min_length=1, max_length=255)
    Empresa: str = Field(min_length=1, max_length=255)


class ExecutivoUpdate(BaseModel):
    Executivo: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Funcao: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Perfil: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Empresa: Optional[str] = Field(default=None, min_length=1, max_length=255)


class ExecutivoOut(BaseModel):
    IdExecutivo: int
    Executivo: str
    Funcao: str
    Perfil: str
    Empresa: str


class ContasPagarCreate(BaseModel):
    Descricao: str = Field(min_length=1, max_length=255)
    TipoCobranca: Optional[str] = Field(default=None, max_length=255)
    IdCobranca: Optional[str] = Field(default=None, max_length=255)
    TagCobranca: Optional[str] = Field(default=None, max_length=255)
    Credor: Optional[str] = Field(default=None, max_length=255)
    TipoCredor: Optional[str] = Field(default=None, max_length=255)
    ValorOriginal: Optional[float] = Field(default=None, ge=0)
    TipoPagamento: Optional[str] = Field(default=None, max_length=30)
    Parcelas: Optional[int] = Field(default=None, ge=1, le=360)
    Desconto: Optional[float] = Field(default=None, ge=0)
    Acrescimo: Optional[float] = Field(default=None, ge=0)
    ValorFinal: Optional[float] = Field(default=None, ge=0)
    DevedorIdExecutivo: Optional[int] = Field(default=None, ge=1)
    Devedor: Optional[str] = Field(default=None, max_length=255)
    StatusPagamento: Optional[str] = Field(default=None, max_length=50)
    StatusCobranca: Optional[str] = Field(default=None, max_length=50)
    Vencimento: Optional[date] = Field(default=None)
    DocumentoPath: Optional[str] = Field(default=None, max_length=1000)
    URLCobranca: Optional[str] = Field(default=None, max_length=1000)
    Usuario: Optional[str] = Field(default=None, max_length=255)
    Senha: Optional[str] = Field(default=None, max_length=255)
    Empresa: Optional[str] = Field(default=None, max_length=255)


class ContasPagarUpdate(BaseModel):
    Descricao: Optional[str] = Field(default=None, min_length=1, max_length=255)
    TipoCobranca: Optional[str] = Field(default=None, max_length=255)
    IdCobranca: Optional[str] = Field(default=None, max_length=255)
    TagCobranca: Optional[str] = Field(default=None, max_length=255)
    Credor: Optional[str] = Field(default=None, max_length=255)
    TipoCredor: Optional[str] = Field(default=None, max_length=255)
    ValorOriginal: Optional[float] = Field(default=None, ge=0)
    TipoPagamento: Optional[str] = Field(default=None, max_length=30)
    Parcelas: Optional[int] = Field(default=None, ge=1, le=360)
    Desconto: Optional[float] = Field(default=None, ge=0)
    Acrescimo: Optional[float] = Field(default=None, ge=0)
    ValorFinal: Optional[float] = Field(default=None, ge=0)
    DevedorIdExecutivo: Optional[int] = Field(default=None, ge=1)
    Devedor: Optional[str] = Field(default=None, max_length=255)
    StatusPagamento: Optional[str] = Field(default=None, max_length=50)
    StatusCobranca: Optional[str] = Field(default=None, max_length=50)
    Vencimento: Optional[date] = Field(default=None)
    DocumentoPath: Optional[str] = Field(default=None, max_length=1000)
    URLCobranca: Optional[str] = Field(default=None, max_length=1000)
    Usuario: Optional[str] = Field(default=None, max_length=255)
    Senha: Optional[str] = Field(default=None, max_length=255)
    Empresa: Optional[str] = Field(default=None, max_length=255)


class ContasPagarOut(BaseModel):
    IdContasPagar: int
    Descricao: str
    TipoCobranca: Optional[str] = None
    IdCobranca: Optional[str] = None
    TagCobranca: Optional[str] = None
    Credor: Optional[str] = None
    TipoCredor: Optional[str] = None
    ValorOriginal: Optional[float] = None
    TipoPagamento: Optional[str] = None
    Parcelas: Optional[int] = None
    Desconto: Optional[float] = None
    Acrescimo: Optional[float] = None
    ValorFinal: Optional[float] = None
    DevedorIdExecutivo: Optional[int] = None
    Devedor: Optional[str] = None
    StatusPagamento: Optional[str] = None
    StatusCobranca: Optional[str] = None
    Vencimento: Optional[date] = None
    DocumentoPath: Optional[str] = None
    URLCobranca: Optional[str] = None
    Usuario: Optional[str] = None
    Senha: Optional[str] = None
    Empresa: Optional[str] = None


class AtivoCreate(BaseModel):
    Ativo: str = Field(min_length=1, max_length=255)
    CodigoInternoAtivo: Optional[str] = Field(default=None, max_length=255)
    Placa: Optional[str] = Field(default=None, max_length=50)
    Cidade: Optional[str] = Field(default=None, max_length=255)
    UF: Optional[str] = Field(default=None, max_length=2)
    CentroCusto: Optional[str] = Field(default=None, max_length=255)
    Proprietario: Optional[str] = Field(default=None, max_length=255)
    Responsavel: Optional[str] = Field(default=None, max_length=255)
    Atribuido: Optional[str] = Field(default=None, max_length=255)
    Empresa: str = Field(min_length=1, max_length=255)


class AtivoUpdate(BaseModel):
    Ativo: Optional[str] = Field(default=None, min_length=1, max_length=255)
    CodigoInternoAtivo: Optional[str] = Field(default=None, max_length=255)
    Placa: Optional[str] = Field(default=None, max_length=50)
    Cidade: Optional[str] = Field(default=None, max_length=255)
    UF: Optional[str] = Field(default=None, max_length=2)
    CentroCusto: Optional[str] = Field(default=None, max_length=255)
    Proprietario: Optional[str] = Field(default=None, max_length=255)
    Responsavel: Optional[str] = Field(default=None, max_length=255)
    Atribuido: Optional[str] = Field(default=None, max_length=255)
    Empresa: Optional[str] = Field(default=None, min_length=1, max_length=255)


class AtivoOut(BaseModel):
    IdAtivo: int
    Ativo: str
    CodigoInternoAtivo: Optional[str] = None
    Placa: Optional[str] = None
    Cidade: Optional[str] = None
    UF: Optional[str] = None
    CentroCusto: Optional[str] = None
    Proprietario: Optional[str] = None
    Responsavel: Optional[str] = None
    Atribuido: Optional[str] = None
    Empresa: Optional[str] = None


class CentroCustosCreate(BaseModel):
    CodigoInterno: Optional[str] = Field(default=None, max_length=255)
    Classe: Optional[str] = Field(default=None, max_length=255)
    Nome: str = Field(min_length=1, max_length=255)
    Cidade: Optional[str] = Field(default=None, max_length=255)
    UF: Optional[str] = Field(default=None, max_length=2)
    Empresa: str = Field(min_length=1, max_length=255)
    Departamento: Optional[str] = Field(default=None, max_length=255)
    Responsavel: Optional[str] = Field(default=None, max_length=255)


class CentroCustosUpdate(BaseModel):
    CodigoInterno: Optional[str] = Field(default=None, max_length=255)
    Classe: Optional[str] = Field(default=None, max_length=255)
    Nome: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Cidade: Optional[str] = Field(default=None, max_length=255)
    UF: Optional[str] = Field(default=None, max_length=2)
    Empresa: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Departamento: Optional[str] = Field(default=None, max_length=255)
    Responsavel: Optional[str] = Field(default=None, max_length=255)


class CentroCustosOut(BaseModel):
    IdCustos: int
    CodigoInterno: Optional[str] = None
    Classe: Optional[str] = None
    Nome: str
    Cidade: Optional[str] = None
    UF: Optional[str] = None
    Empresa: str
    Departamento: Optional[str] = None
    Responsavel: Optional[str] = None


class TenantCreate(BaseModel):
    Tenant: str = Field(min_length=1, max_length=255)
    Slug: str = Field(min_length=1, max_length=255)
    Cadastrante: Optional[str] = Field(default=None, max_length=255)


class TenantUpdate(BaseModel):
    Tenant: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Slug: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Cadastrante: Optional[str] = Field(default=None, max_length=255)


class TenantOut(BaseModel):
    IdTenant: int
    Tenant: str
    Slug: str
    DataCriacao: date
    DataUpdate: date
    Cadastrante: Optional[str] = None


class UsuarioCreate(BaseModel):
    Usuario: str = Field(min_length=1, max_length=255)
    Senha: str = Field(min_length=1, max_length=255)
    TenantId: Optional[int] = None
    Role: Optional[str] = Field(default=None, max_length=50)
    Nome: str = Field(min_length=1, max_length=255)
    Funcao: Optional[str] = Field(default=None, max_length=255)
    Perfil: Optional[str] = Field(default=None, max_length=255)
    Permissao: Optional[str] = Field(default=None, max_length=255)
    Celular: Optional[str] = Field(default=None, max_length=30)
    Email: Optional[str] = Field(default=None, max_length=255)
    Ativo: Optional[int] = Field(default=1, ge=0, le=1)


class UsuarioUpdate(BaseModel):
    Usuario: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Senha: Optional[str] = Field(default=None, max_length=255)
    TenantId: Optional[int] = None
    Role: Optional[str] = Field(default=None, max_length=50)
    Nome: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Funcao: Optional[str] = Field(default=None, max_length=255)
    Perfil: Optional[str] = Field(default=None, max_length=255)
    Permissao: Optional[str] = Field(default=None, max_length=255)
    Celular: Optional[str] = Field(default=None, max_length=30)
    Email: Optional[str] = Field(default=None, max_length=255)
    Ativo: Optional[int] = Field(default=None, ge=0, le=1)


class UsuarioOut(BaseModel):
    IdUsuarios: int
    Usuario: str
    TenantId: int
    Role: str
    Nome: Optional[str] = None
    Funcao: Optional[str] = None
    Perfil: Optional[str] = None
    Permissao: Optional[str] = None
    Celular: Optional[str] = None
    Email: Optional[str] = None
    Ativo: int


class LoginIn(BaseModel):
    Usuario: str = Field(min_length=1, max_length=255)
    Senha: str = Field(min_length=1, max_length=255)
    TenantSlug: Optional[str] = Field(default=None, max_length=255)


class LoginOut(BaseModel):
    token: str
    usuario: str
    role: str
    nome: Optional[str] = None
    perfil: Optional[str] = None
    tenant: TenantOut
    superadmin: bool


def _auth_secret() -> bytes:
    return str(os.getenv("AUTH_SECRET") or "dev-secret-change-me").encode("utf-8")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + pad).encode("utf-8"))


def _sign_token(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    body = _b64url_encode(raw)
    sig = hmac.new(_auth_secret(), body.encode("utf-8"), hashlib.sha256).digest()
    return f"{body}.{_b64url_encode(sig)}"


def _verify_token(token: str) -> Optional[dict[str, Any]]:
    try:
        body, sig = token.split(".", 1)
    except ValueError:
        return None
    expected = hmac.new(_auth_secret(), body.encode("utf-8"), hashlib.sha256).digest()
    try:
        provided = _b64url_decode(sig)
    except Exception:
        return None
    if not hmac.compare_digest(expected, provided):
        return None
    try:
        payload = json.loads(_b64url_decode(body).decode("utf-8"))
    except Exception:
        return None
    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and time.time() > float(exp):
        return None
    return payload if isinstance(payload, dict) else None


def _get_auth(authorization: Optional[str] = Header(default=None)) -> Optional[dict[str, Any]]:
    v = str(authorization or "").strip()
    if not v:
        return None
    if v.lower().startswith("bearer "):
        v = v.split(" ", 1)[1].strip()
    if not v:
        return None
    return _verify_token(v)


def _is_superadmin(auth: Optional[dict[str, Any]]) -> bool:
    if not auth:
        return False
    return str(auth.get("role") or "").upper() == "SUPERADMIN" and str(auth.get("tenant_slug") or "") == "executive"


def _is_executive_tenant(auth: Optional[dict[str, Any]]) -> bool:
    if not auth:
        return False
    return str(auth.get("tenant_slug") or "") == "executive"


def _is_admin(auth: Optional[dict[str, Any]]) -> bool:
    if not auth:
        return False
    return str(auth.get("role") or "").upper() in {"ADMIN", "SUPERADMIN"}


def _require_auth(auth: Optional[dict[str, Any]] = Depends(_get_auth)) -> dict[str, Any]:
    if not auth:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    return auth


def _require_admin(auth: dict[str, Any] = Depends(_require_auth)) -> dict[str, Any]:
    if not _is_admin(auth):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    return auth


def _require_superadmin(auth: Optional[dict[str, Any]] = Depends(_get_auth)) -> dict[str, Any]:
    if not _is_superadmin(auth):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    return auth or {}


app = FastAPI(title="Executive API", version="0.1.0")

def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS")
    if raw is None or not str(raw).strip() or str(raw).strip() == "*":
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    return [o.strip() for o in str(raw).split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=0,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _usuario_as_out(row: UsuariosModel) -> UsuarioOut:
    return UsuarioOut(
        IdUsuarios=int(row.IdUsuario),
        Usuario=str(row.Usuario),
        TenantId=int(row.TenantId or 0),
        Role=str(row.Role or ""),
        Nome=str(row.Nome) if row.Nome is not None else None,
        Funcao=str(row.Funcao) if row.Funcao is not None else None,
        Perfil=str(row.Perfil) if row.Perfil is not None else None,
        Permissao=str(row.Permissao) if row.Permissao is not None else None,
        Celular=str(row.Celular) if row.Celular is not None else None,
        Email=str(row.Email) if row.Email is not None else None,
        Ativo=int(row.Ativo or 0),
    )


@app.get("/api/usuarios", response_model=list[UsuarioOut])
def list_usuarios(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    auth: dict[str, Any] = Depends(_require_admin),
) -> list[UsuarioOut]:
    stmt = select(UsuariosModel)
    if _is_superadmin(auth):
        if tenant_id is not None:
            stmt = stmt.where(UsuariosModel.TenantId == int(tenant_id))
    else:
        stmt = stmt.where(UsuariosModel.TenantId == int(auth.get("tenant_id") or 0))
    rows = db.execute(stmt.order_by(UsuariosModel.IdUsuario.asc())).scalars().all()
    return [_usuario_as_out(r) for r in rows]


@app.get("/api/usuarios/{id_usuario}", response_model=UsuarioOut)
def get_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    auth: dict[str, Any] = Depends(_require_admin),
) -> UsuarioOut:
    row = db.get(UsuariosModel, int(id_usuario))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if not _is_superadmin(auth) and int(row.TenantId or 0) != int(auth.get("tenant_id") or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    return _usuario_as_out(row)


@app.post("/api/usuarios", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def create_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    auth: dict[str, Any] = Depends(_require_admin),
) -> UsuarioOut:
    username = payload.Usuario.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuário inválido")

    tenant_id = int(payload.TenantId) if _is_superadmin(auth) and payload.TenantId is not None else int(auth.get("tenant_id") or 0)
    if tenant_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant inválido")

    role = str(payload.Role).strip().upper() if _is_superadmin(auth) and payload.Role else "USER"
    if not role:
        role = "USER"

    existing = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == username)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuário já existe")

    nome = payload.Nome.strip()
    if not nome:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nome inválido")

    salt_hex = os.urandom(16).hex()
    senha_hash = _pbkdf2_hash_password(payload.Senha, salt_hex)
    row = UsuariosModel(
        Usuario=username,
        TenantId=tenant_id,
        Role=role,
        Nome=nome,
        Funcao=payload.Funcao.strip() if isinstance(payload.Funcao, str) and payload.Funcao.strip() else None,
        Perfil=payload.Perfil.strip() if isinstance(payload.Perfil, str) and payload.Perfil.strip() else None,
        Permissao=payload.Permissao.strip() if isinstance(payload.Permissao, str) and payload.Permissao.strip() else None,
        Celular=payload.Celular.strip() if isinstance(payload.Celular, str) and payload.Celular.strip() else None,
        Email=payload.Email.strip() if isinstance(payload.Email, str) and payload.Email.strip() else None,
        SenhaSalt=salt_hex,
        SenhaHash=senha_hash,
        Ativo=int(payload.Ativo or 0),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar usuário")
    db.refresh(row)
    return _usuario_as_out(row)


@app.put("/api/usuarios/{id_usuario}", response_model=UsuarioOut)
def update_usuario(
    id_usuario: int,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    auth: dict[str, Any] = Depends(_require_admin),
) -> UsuarioOut:
    row = db.get(UsuariosModel, int(id_usuario))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if not _is_superadmin(auth) and int(row.TenantId or 0) != int(auth.get("tenant_id") or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

    data: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if "Usuario" in data and isinstance(data.get("Usuario"), str):
        v = data["Usuario"].strip()
        if v:
            row.Usuario = v
    if "Funcao" in data:
        v = data.get("Funcao")
        row.Funcao = v.strip() if isinstance(v, str) and v.strip() else None
    if "Nome" in data:
        v = data.get("Nome")
        row.Nome = v.strip() if isinstance(v, str) and v.strip() else None
    if "Perfil" in data:
        v = data.get("Perfil")
        row.Perfil = v.strip() if isinstance(v, str) and v.strip() else None
    if "Permissao" in data:
        v = data.get("Permissao")
        row.Permissao = v.strip() if isinstance(v, str) and v.strip() else None
    if "Celular" in data:
        v = data.get("Celular")
        row.Celular = v.strip() if isinstance(v, str) and v.strip() else None
    if "Email" in data:
        v = data.get("Email")
        row.Email = v.strip() if isinstance(v, str) and v.strip() else None
    if "Ativo" in data and data.get("Ativo") is not None:
        row.Ativo = int(data["Ativo"])

    if _is_superadmin(auth):
        if "TenantId" in data and data.get("TenantId") is not None:
            row.TenantId = int(data["TenantId"])
        if "Role" in data and isinstance(data.get("Role"), str) and str(data.get("Role")).strip():
            row.Role = str(data["Role"]).strip().upper()

    senha = data.get("Senha")
    if isinstance(senha, str) and senha.strip():
        salt_hex = os.urandom(16).hex()
        row.SenhaSalt = salt_hex
        row.SenhaHash = _pbkdf2_hash_password(senha, salt_hex)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar usuário")
    db.refresh(row)
    return _usuario_as_out(row)


@app.delete("/api/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
def delete_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    auth: dict[str, Any] = Depends(_require_admin),
) -> None:
    row = db.get(UsuariosModel, int(id_usuario))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if not _is_superadmin(auth) and int(row.TenantId or 0) != int(auth.get("tenant_id") or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    db.delete(row)
    db.commit()


@app.post("/api/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)) -> LoginOut:
    usuario_in = payload.Usuario.strip()
    user = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == usuario_in)).scalar_one_or_none()
    if not user:
        user = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == usuario_in.upper())).scalar_one_or_none()
    if not user:
        user = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == usuario_in.lower())).scalar_one_or_none()
    if not user or int(user.Ativo or 0) != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inválido")

    senha_hash = _pbkdf2_hash_password(payload.Senha, str(user.SenhaSalt))
    if not hmac.compare_digest(str(user.SenhaHash), senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    username_upper = str(user.Usuario or "").upper()
    is_admin_user = username_upper in {"ADMINISTRADOR", "ADMINISTRATOR"}
    is_superadmin = str(user.Role or "").upper() == "SUPERADMIN"

    tenant: Optional[TenantsModel] = None
    if is_admin_user:
        tenant = db.execute(select(TenantsModel).where(TenantsModel.Slug == "executive")).scalar_one_or_none()
        if not tenant or not is_superadmin:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
        if int(user.TenantId or 0) != int(tenant.IdTenant):
            user.TenantId = int(tenant.IdTenant)
            db.commit()
            db.refresh(user)
    else:
        tenant_slug_raw = str(payload.TenantSlug or "").strip().lower()
        if not tenant_slug_raw:
            u = str(user.Usuario or "").strip()
            if u.upper().startswith("ADMIN.") and len(u) > 6:
                inferred = u.split(".", 1)[1].strip().lower()
                tenant_slug_raw = inferred
        if tenant_slug_raw:
            tenant = db.execute(select(TenantsModel).where(TenantsModel.Slug == tenant_slug_raw)).scalar_one_or_none()
            if not tenant:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tenant inválido")
            if int(user.TenantId) != int(tenant.IdTenant):
                old_tenant = db.get(TenantsModel, int(user.TenantId))
                old_slug = str(old_tenant.Slug).strip().lower() if old_tenant else ""
                if not old_tenant or old_slug == tenant_slug_raw:
                    user.TenantId = int(tenant.IdTenant)
                    db.commit()
                    db.refresh(user)
                else:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
        else:
            tenant = db.get(TenantsModel, int(user.TenantId))
            if not tenant:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tenant inválido")

    exp = time.time() + 60 * 60 * 12
    token = _sign_token(
        {
            "sub": str(user.Usuario),
            "role": str(user.Role),
            "tenant_id": int(tenant.IdTenant),
            "tenant_slug": str(tenant.Slug),
            "exp": exp,
        }
    )

    return LoginOut(
        token=token,
        usuario=str(user.Usuario),
        role=str(user.Role),
        nome=str(user.Nome).strip() if user.Nome is not None and str(user.Nome).strip() else None,
        perfil=str(user.Perfil).strip() if user.Perfil is not None and str(user.Perfil).strip() else None,
        tenant=TenantOut(
            IdTenant=tenant.IdTenant,
            Tenant=tenant.Tenant,
            Slug=tenant.Slug,
            DataCriacao=tenant.DataCriacao,
            DataUpdate=tenant.DataUpdate,
            Cadastrante=tenant.Cadastrante,
        ),
        superadmin=bool(is_admin_user and is_superadmin and str(tenant.Slug) == "executive"),
    )


@app.get("/api/executivos", response_model=list[ExecutivoOut])
def list_executivos(
    empresa: Optional[str] = None, db: Session = Depends(get_db), auth: Optional[dict[str, Any]] = Depends(_get_auth)
) -> list[ExecutivoOut]:
    if not empresa and not (_is_superadmin(auth) or _is_executive_tenant(auth)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    stmt = select(ExecutivoModel)
    if empresa:
        stmt = stmt.where(ExecutivoModel.Empresa == empresa)
    rows = db.execute(stmt.order_by(ExecutivoModel.IdExecutivo.asc())).scalars().all()
    return [
        ExecutivoOut(
            IdExecutivo=r.IdExecutivo,
            Executivo=r.Executivo,
            Funcao=r.Funcao,
            Perfil=r.Perfil,
            Empresa=r.Empresa,
        )
        for r in rows
    ]


@app.get("/api/executivos/{id_executivo}", response_model=ExecutivoOut)
def get_executivo(id_executivo: int, db: Session = Depends(get_db)) -> ExecutivoOut:
    row = db.get(ExecutivoModel, id_executivo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Executivo não encontrado")
    return ExecutivoOut(
        IdExecutivo=row.IdExecutivo,
        Executivo=row.Executivo,
        Funcao=row.Funcao,
        Perfil=row.Perfil,
        Empresa=row.Empresa,
    )


@app.post("/api/executivos", response_model=ExecutivoOut, status_code=status.HTTP_201_CREATED)
def create_executivo(payload: ExecutivoCreate, db: Session = Depends(get_db)) -> ExecutivoOut:
    row = ExecutivoModel(
        Executivo=payload.Executivo.strip(),
        Funcao=payload.Funcao.strip(),
        Perfil=payload.Perfil.strip(),
        Empresa=payload.Empresa.strip(),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar executivo")
    db.refresh(row)
    return ExecutivoOut(
        IdExecutivo=row.IdExecutivo,
        Executivo=row.Executivo,
        Funcao=row.Funcao,
        Perfil=row.Perfil,
        Empresa=row.Empresa,
    )


@app.put("/api/executivos/{id_executivo}", response_model=ExecutivoOut)
def update_executivo(id_executivo: int, payload: ExecutivoUpdate, db: Session = Depends(get_db)) -> ExecutivoOut:
    row = db.get(ExecutivoModel, id_executivo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Executivo não encontrado")

    data: dict[str, Any] = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if v is None:
            continue
        setattr(row, k, v.strip() if isinstance(v, str) else v)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar executivo")
    db.refresh(row)
    return ExecutivoOut(
        IdExecutivo=row.IdExecutivo,
        Executivo=row.Executivo,
        Funcao=row.Funcao,
        Perfil=row.Perfil,
        Empresa=row.Empresa,
    )


@app.delete("/api/executivos/{id_executivo}", status_code=status.HTTP_204_NO_CONTENT)
def delete_executivo(id_executivo: int, db: Session = Depends(get_db)) -> None:
    row = db.get(ExecutivoModel, id_executivo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Executivo não encontrado")
    db.delete(row)
    db.commit()


def _ativo_as_out(row: AtivoModel) -> AtivoOut:
    return AtivoOut(
        IdAtivo=row.IdAtivo,
        Ativo=row.Ativo,
        CodigoInternoAtivo=row.CodigoInternoAtivo,
        Placa=row.Placa,
        Cidade=row.Cidade,
        UF=row.UF,
        CentroCusto=row.CentroCusto,
        Proprietario=row.Proprietario,
        Responsavel=row.Responsavel,
        Atribuido=row.Atribuido,
        Empresa=row.Empresa,
    )


@app.get("/api/ativos", response_model=list[AtivoOut])
def list_ativos(
    empresa: Optional[str] = None, db: Session = Depends(get_db), auth: Optional[dict[str, Any]] = Depends(_get_auth)
) -> list[AtivoOut]:
    if not empresa and not (_is_superadmin(auth) or _is_executive_tenant(auth)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    stmt = select(AtivoModel)
    if empresa:
        stmt = stmt.where(AtivoModel.Empresa == empresa)
    rows = db.execute(stmt.order_by(AtivoModel.IdAtivo.asc())).scalars().all()
    return [_ativo_as_out(r) for r in rows]


@app.get("/api/ativos/{id_ativo}", response_model=AtivoOut)
def get_ativo(id_ativo: int, db: Session = Depends(get_db)) -> AtivoOut:
    row = db.get(AtivoModel, id_ativo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado")
    return _ativo_as_out(row)


@app.post("/api/ativos", response_model=AtivoOut, status_code=status.HTTP_201_CREATED)
def create_ativo(payload: AtivoCreate, db: Session = Depends(get_db)) -> AtivoOut:
    row = AtivoModel(
        Ativo=payload.Ativo.strip(),
        CodigoInternoAtivo=payload.CodigoInternoAtivo.strip() if isinstance(payload.CodigoInternoAtivo, str) else None,
        Placa=payload.Placa.strip() if isinstance(payload.Placa, str) else None,
        Cidade=payload.Cidade.strip() if isinstance(payload.Cidade, str) else None,
        UF=payload.UF.strip() if isinstance(payload.UF, str) else None,
        CentroCusto=payload.CentroCusto.strip() if isinstance(payload.CentroCusto, str) else None,
        Proprietario=payload.Proprietario.strip() if isinstance(payload.Proprietario, str) else None,
        Responsavel=payload.Responsavel.strip() if isinstance(payload.Responsavel, str) else None,
        Atribuido=payload.Atribuido.strip() if isinstance(payload.Atribuido, str) else None,
        Empresa=payload.Empresa.strip(),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar ativo")
    db.refresh(row)
    return _ativo_as_out(row)


@app.put("/api/ativos/{id_ativo}", response_model=AtivoOut)
def update_ativo(id_ativo: int, payload: AtivoUpdate, db: Session = Depends(get_db)) -> AtivoOut:
    row = db.get(AtivoModel, id_ativo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado")

    data: dict[str, Any] = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(row, k, v)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar ativo")
    db.refresh(row)
    return _ativo_as_out(row)


@app.delete("/api/ativos/{id_ativo}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ativo(id_ativo: int, db: Session = Depends(get_db)) -> None:
    row = db.get(AtivoModel, id_ativo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado")
    db.delete(row)
    db.commit()


def _centro_custos_as_out(row: CentroCustosModel) -> CentroCustosOut:
    return CentroCustosOut(
        IdCustos=row.IdCustos,
        CodigoInterno=row.CodigoInterno,
        Classe=row.Classe,
        Nome=row.Nome,
        Cidade=row.Cidade,
        UF=row.UF,
        Empresa=row.Empresa,
        Departamento=row.Departamento,
        Responsavel=row.Responsavel,
    )


@app.get("/api/centro-custos", response_model=list[CentroCustosOut])
def list_centro_custos(
    empresa: Optional[str] = None, db: Session = Depends(get_db), auth: Optional[dict[str, Any]] = Depends(_get_auth)
) -> list[CentroCustosOut]:
    if not empresa and not (_is_superadmin(auth) or _is_executive_tenant(auth)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    stmt = select(CentroCustosModel)
    if empresa:
        stmt = stmt.where(CentroCustosModel.Empresa == empresa)
    rows = db.execute(stmt.order_by(CentroCustosModel.IdCustos.asc())).scalars().all()
    return [_centro_custos_as_out(r) for r in rows]


@app.get("/api/centro-custos/{id_custos}", response_model=CentroCustosOut)
def get_centro_custos(id_custos: int, db: Session = Depends(get_db)) -> CentroCustosOut:
    row = db.get(CentroCustosModel, id_custos)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de custos não encontrado")
    return _centro_custos_as_out(row)


@app.post("/api/centro-custos", response_model=CentroCustosOut, status_code=status.HTTP_201_CREATED)
def create_centro_custos(payload: CentroCustosCreate, db: Session = Depends(get_db)) -> CentroCustosOut:
    row = CentroCustosModel(
        CodigoInterno=payload.CodigoInterno.strip() if isinstance(payload.CodigoInterno, str) else None,
        Classe=payload.Classe.strip() if isinstance(payload.Classe, str) else None,
        Nome=payload.Nome.strip(),
        Cidade=payload.Cidade.strip() if isinstance(payload.Cidade, str) else None,
        UF=payload.UF.strip() if isinstance(payload.UF, str) else None,
        Empresa=payload.Empresa.strip(),
        Departamento=payload.Departamento.strip() if isinstance(payload.Departamento, str) else None,
        Responsavel=payload.Responsavel.strip() if isinstance(payload.Responsavel, str) else None,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar centro de custos")
    db.refresh(row)
    return _centro_custos_as_out(row)


@app.put("/api/centro-custos/{id_custos}", response_model=CentroCustosOut)
def update_centro_custos(id_custos: int, payload: CentroCustosUpdate, db: Session = Depends(get_db)) -> CentroCustosOut:
    row = db.get(CentroCustosModel, id_custos)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de custos não encontrado")

    data: dict[str, Any] = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(row, k, v)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar centro de custos")
    db.refresh(row)
    return _centro_custos_as_out(row)


@app.delete("/api/centro-custos/{id_custos}", status_code=status.HTTP_204_NO_CONTENT)
def delete_centro_custos(id_custos: int, db: Session = Depends(get_db)) -> None:
    row = db.get(CentroCustosModel, id_custos)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de custos não encontrado")
    db.delete(row)
    db.commit()


def _sanitize_identifier(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "_", str(value or "")).strip("_")
    cleaned = re.sub(r"_+", "_", cleaned)
    if not cleaned:
        cleaned = "tenant"
    if re.match(r"^[0-9]", cleaned):
        cleaned = f"t_{cleaned}"
    return cleaned[:63]


def _sanitize_db_name(value: str) -> str:
    raw = str(value or "").strip().lower()
    raw = re.sub(r"[^a-z0-9_-]+", "_", raw)
    raw = re.sub(r"_+", "_", raw)
    raw = re.sub(r"-+", "-", raw)
    raw = raw.strip("_-")
    if not raw:
        raw = "tenant"
    if len(raw) > 63:
        raw = raw[:63]
    return raw


def _tenant_db_name(*, tenant_id: int, slug: str) -> str:
    return _sanitize_db_name(f"{str(slug or '').strip().lower()}-{int(tenant_id)}")


def _tenant_engine(*, db_name: str) -> Engine:
    url = make_url(DATABASE_URL)
    tenant_url = url.set(database=db_name)
    tenant_url_str = tenant_url.render_as_string(hide_password=False)
    connect_args = _connect_args(tenant_url_str)
    return create_engine(tenant_url_str, connect_args=connect_args, pool_pre_ping=True)


def _seed_tenant_admin_user(*, db_name: str, tenant_id: int, slug: str) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return

    if str(slug).lower() == "executive":
        return

    admin_username = f"ADMIN.{str(slug).upper()}"
    tenant_engine = _tenant_engine(db_name=db_name)
    TenantSession = sessionmaker(bind=tenant_engine, autoflush=False, autocommit=False)
    with TenantSession() as db:
        existing = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == admin_username)).scalar_one_or_none()
        if existing:
            if int(existing.TenantId) != int(tenant_id):
                existing.TenantId = int(tenant_id)
            existing.Role = "ADMIN"
            existing.Ativo = 1
            db.commit()
            return

        salt_hex = os.urandom(16).hex()
        senha_hash = _pbkdf2_hash_password("admin", salt_hex)
        db.add(
            UsuariosModel(
                Usuario=admin_username,
                TenantId=int(tenant_id),
                Role="ADMIN",
                SenhaSalt=salt_hex,
                SenhaHash=senha_hash,
                Ativo=1,
            )
        )
        db.commit()


def _create_db_schema(db_name: str, schema_name: str) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return

    db_name = _sanitize_db_name(db_name)
    schema_name = _sanitize_identifier(schema_name)

    url = make_url(DATABASE_URL)
    admin_db = os.getenv("POSTGRES_ADMIN_DB")
    if not admin_db or not str(admin_db).strip():
        admin_db = str(url.database or "").strip() or "postgres"
    admin_url = url.set(database=admin_db)

    admin_url_str = admin_url.render_as_string(hide_password=False)
    admin_connect_args = _connect_args(admin_url_str)
    admin_engine = create_engine(
        admin_url_str,
        connect_args=admin_connect_args,
        isolation_level="AUTOCOMMIT",
        pool_pre_ping=True,
    )
    with admin_engine.connect() as conn:
        exists = conn.execute(text("select 1 from pg_database where datname=:n"), {"n": db_name}).first()
        if not exists:
            conn.exec_driver_sql(f'CREATE DATABASE "{db_name}"')

    tenant_engine = _tenant_engine(db_name=db_name)
    with tenant_engine.connect() as conn:
        conn.exec_driver_sql(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
        conn.commit()

    meta = MetaData()
    meta.reflect(bind=engine, schema=schema_name)

    tenants_table_names = {"tenant", "tenants"}
    for table in list(meta.tables.values()):
        if str(getattr(table, "schema", "") or "") != schema_name:
            continue
        if str(getattr(table, "name", "") or "").lower() in tenants_table_names:
            meta.remove(table)

    for table in list(meta.tables.values()):
        for constraint in list(table.constraints):
            if not isinstance(constraint, ForeignKeyConstraint):
                continue
            if any(
                str(getattr(elem.column.table, "schema", "") or "") == schema_name
                and str(getattr(elem.column.table, "name", "") or "").lower() in tenants_table_names
                for elem in constraint.elements
            ):
                table.constraints.discard(constraint)

    meta.create_all(bind=tenant_engine, checkfirst=True)


def _tenant_as_out(row: TenantsModel) -> TenantOut:
    return TenantOut(
        IdTenant=row.IdTenant,
        Tenant=row.Tenant,
        Slug=row.Slug,
        DataCriacao=row.DataCriacao,
        DataUpdate=row.DataUpdate,
        Cadastrante=row.Cadastrante,
    )


@app.get("/api/tenants", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db), auth: dict[str, Any] = Depends(_require_superadmin)) -> list[TenantOut]:
    rows = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
    return [_tenant_as_out(r) for r in rows]


@app.get("/api/tenants/{id_tenant}", response_model=TenantOut)
def get_tenant(id_tenant: int, db: Session = Depends(get_db), auth: dict[str, Any] = Depends(_require_superadmin)) -> TenantOut:
    row = db.get(TenantsModel, id_tenant)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")
    return _tenant_as_out(row)


@app.post("/api/tenants", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), auth: dict[str, Any] = Depends(_require_superadmin)) -> TenantOut:
    tenant_name = payload.Tenant.strip()
    slug_raw = payload.Slug.strip().lower()
    if not slug_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug inválido")

    existing = db.execute(select(TenantsModel).where(TenantsModel.Slug == slug_raw)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug já existe")

    today = date.today()
    row = TenantsModel(
        Tenant=tenant_name,
        Slug=slug_raw,
        DataCriacao=today,
        DataUpdate=today,
        Cadastrante=payload.Cadastrante.strip() if isinstance(payload.Cadastrante, str) else None,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar tenant")
    db.refresh(row)

    db_name = _tenant_db_name(tenant_id=int(row.IdTenant), slug=str(row.Slug))
    try:
        _create_db_schema(db_name, SCHEMA_NAME)
        _seed_tenant_admin_user(db_name=db_name, tenant_id=int(row.IdTenant), slug=str(row.Slug))
    except Exception as e:
        try:
            db.delete(row)
            db.commit()
        except Exception:
            pass
        safe_db = _sanitize_db_name(db_name)
        safe_schema = _sanitize_identifier(SCHEMA_NAME)
        orig = getattr(e, "orig", None)
        msg = str(orig or e or "").strip()
        msg = re.sub(r"\s+", " ", msg).strip()
        if not msg:
            msg = str(e.__class__.__name__)
        if len(msg) > 240:
            msg = msg[:240].rstrip() + "..."
        detail = f'Falha ao provisionar banco/schema do tenant (db="{safe_db}", schema="{safe_schema}"): {msg}'
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    if str(row.Slug).lower() != "executive":
        admin_username = f"ADMIN.{str(row.Slug).upper()}"
        existing_admin = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == admin_username)).scalar_one_or_none()
        if existing_admin:
            if int(existing_admin.TenantId or 0) != int(row.IdTenant):
                existing_admin.TenantId = int(row.IdTenant)
            existing_admin.Role = "ADMIN"
            existing_admin.Ativo = 1
            db.commit()
        else:
            salt_hex = os.urandom(16).hex()
            senha_hash = _pbkdf2_hash_password("admin", salt_hex)
            db.add(
                UsuariosModel(
                    Usuario=admin_username,
                    TenantId=int(row.IdTenant),
                    Role="ADMIN",
                    SenhaSalt=salt_hex,
                    SenhaHash=senha_hash,
                    Ativo=1,
                )
            )
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                existing_admin = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == admin_username)).scalar_one_or_none()
                if not existing_admin or int(existing_admin.TenantId) != int(row.IdTenant):
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Falha ao criar usuário do tenant")

    return _tenant_as_out(row)


@app.put("/api/tenants/{id_tenant}", response_model=TenantOut)
def update_tenant(
    id_tenant: int, payload: TenantUpdate, db: Session = Depends(get_db), auth: dict[str, Any] = Depends(_require_superadmin)
) -> TenantOut:
    row = db.get(TenantsModel, id_tenant)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")

    old_slug = str(row.Slug or "")
    data: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if "Tenant" in data and isinstance(data.get("Tenant"), str):
        row.Tenant = data["Tenant"].strip()
    if "Slug" in data and isinstance(data.get("Slug"), str):
        slug_raw = data["Slug"].strip().lower()
        if not slug_raw:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug inválido")
        existing = db.execute(select(TenantsModel).where(TenantsModel.Slug == slug_raw, TenantsModel.IdTenant != id_tenant)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug já existe")
        row.Slug = slug_raw
    if "Cadastrante" in data:
        v = data.get("Cadastrante")
        row.Cadastrante = v.strip() if isinstance(v, str) else None

    row.DataUpdate = date.today()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar tenant")
    db.refresh(row)

    db_name = _tenant_db_name(tenant_id=int(row.IdTenant), slug=str(row.Slug))
    try:
        _create_db_schema(db_name, SCHEMA_NAME)
        _seed_tenant_admin_user(db_name=db_name, tenant_id=int(row.IdTenant), slug=str(row.Slug))
    except Exception as e:
        safe_db = _sanitize_db_name(db_name)
        safe_schema = _sanitize_identifier(SCHEMA_NAME)
        orig = getattr(e, "orig", None)
        msg = str(orig or e or "").strip()
        msg = re.sub(r"\s+", " ", msg).strip()
        if not msg:
            msg = str(e.__class__.__name__)
        if len(msg) > 240:
            msg = msg[:240].rstrip() + "..."
        detail = f'Falha ao provisionar banco/schema do tenant (db="{safe_db}", schema="{safe_schema}"): {msg}'
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    if str(row.Slug).lower() != "executive":
        desired_username = f"ADMIN.{str(row.Slug).upper()}"
        existing_desired = db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == desired_username)).scalar_one_or_none()
        if existing_desired:
            if int(existing_desired.TenantId or 0) != int(row.IdTenant):
                existing_desired.TenantId = int(row.IdTenant)
            existing_desired.Role = "ADMIN"
            existing_desired.Ativo = 1
            db.commit()
        else:
            old_username = f"ADMIN.{old_slug.upper()}" if old_slug else ""
            existing_old = (
                db.execute(select(UsuariosModel).where(UsuariosModel.Usuario == old_username)).scalar_one_or_none()
                if old_username
                else None
            )
            if existing_old and int(existing_old.TenantId) == int(row.IdTenant):
                existing_old.Usuario = desired_username
                try:
                    db.commit()
                except IntegrityError:
                    db.rollback()
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Falha ao atualizar usuário do tenant")
            else:
                salt_hex = os.urandom(16).hex()
                senha_hash = _pbkdf2_hash_password("admin", salt_hex)
                db.add(
                    UsuariosModel(
                        Usuario=desired_username,
                        TenantId=int(row.IdTenant),
                        Role="ADMIN",
                        SenhaSalt=salt_hex,
                        SenhaHash=senha_hash,
                        Ativo=1,
                    )
                )
                try:
                    db.commit()
                except IntegrityError:
                    db.rollback()
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Falha ao criar usuário do tenant")

    return _tenant_as_out(row)


@app.delete("/api/tenants/{id_tenant}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(id_tenant: int, db: Session = Depends(get_db), auth: dict[str, Any] = Depends(_require_superadmin)) -> None:
    row = db.get(TenantsModel, id_tenant)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")
    db.delete(row)
    db.commit()


def _sanitize_segment(value: str) -> str:
    cleaned = re.sub(r"[^\w\s.-]+", "", value, flags=re.UNICODE).strip()
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or "SemEmpresa"


def _contas_pagar_base_dir() -> Path:
    base = os.getenv("CONTAS_PAGAR_BASE_DIR")
    if base:
        return Path(base)
    return Path(r"d:\PROJETOS\EXECUTIVE\Backend\Downloads\ContasPagar\Empresa")


def _resolve_document_path(path_value: str) -> Path:
    base = _contas_pagar_base_dir().resolve()
    target = Path(path_value).resolve()
    if os.path.commonpath([str(base), str(target)]) != str(base):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Documento inválido")
    return target


def _nestjs_base_url() -> str:
    return str(os.getenv("NESTJS_BASE_URL") or "http://localhost:3000").rstrip("/")


def _nestjs_media_url(path: str = "") -> str:
    base = _nestjs_base_url()
    p = str(path or "")
    if p and not p.startswith("/"):
        p = "/" + p
    return f"{base}/media{p}"


def _multipart_file_body(*, field_name: str, filename: str, content_type: Optional[str], content: bytes) -> tuple[bytes, str]:
    boundary = uuid4().hex
    safe_filename = filename.replace('"', "'")
    pre = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{safe_filename}"\r\n'
        + (f"Content-Type: {content_type}\r\n" if content_type else "")
        + "\r\n"
    ).encode("utf-8")
    post = f"\r\n--{boundary}--\r\n".encode("utf-8")
    body = pre + content + post
    return body, f"multipart/form-data; boundary={boundary}"


def _nestjs_upload_media(*, filename: str, content_type: Optional[str], content: bytes) -> str:
    body, ct = _multipart_file_body(field_name="file", filename=filename, content_type=content_type, content=content)
    req = urllib.request.Request(
        _nestjs_media_url(),
        data=body,
        method="POST",
        headers={
            "Content-Type": ct,
            "Content-Length": str(len(body)),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = resp.read()
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", errors="ignore")
        except Exception:
            detail = ""
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Falha ao salvar mídia no NestJS: {detail}".strip())
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao salvar mídia no NestJS")

    try:
        data = json.loads(payload.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Resposta inválida do NestJS ao salvar mídia")

    media_id = str((data or {}).get("id") or "").strip()
    if not media_id:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Resposta inválida do NestJS ao salvar mídia")
    return media_id


def _is_media_ref(value: str) -> bool:
    v = (value or "").strip()
    if not v:
        return False
    if v.startswith("media:"):
        return True
    if re.fullmatch(r"[0-9a-fA-F]{24}", v):
        return True
    return False


def _media_id_from_ref(value: str) -> str:
    v = (value or "").strip()
    return v.split("media:", 1)[1].strip() if v.startswith("media:") else v


def _stream_urlopen_response(resp: Any):
    try:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            yield chunk
    finally:
        try:
            resp.close()
        except Exception:
            pass


def _calc_valor_final(valor_original: Optional[float], parcelas: Optional[int], desconto: Optional[float], acrescimo: Optional[float]) -> Optional[float]:
    if valor_original is None:
        return None
    p = parcelas or 1
    if p < 1:
        p = 1
    base = float(valor_original)
    d = float(desconto or 0)
    a = float(acrescimo or 0)
    total = max(0.0, base - d + a)
    return total / p if p > 1 else total


def _as_out(row: ContasPagarModel) -> ContasPagarOut:
    def _to_float(v: Any) -> Optional[float]:
        if v is None:
            return None
        try:
            return float(v)
        except Exception:
            return None

    return ContasPagarOut(
        IdContasPagar=row.IdContasPagar,
        Descricao=row.Descricao,
        TipoCobranca=row.TipoCobranca,
        IdCobranca=row.IdCobranca,
        TagCobranca=row.TagCobranca,
        Credor=row.Credor,
        TipoCredor=row.TipoCredor,
        ValorOriginal=_to_float(row.ValorOriginal),
        TipoPagamento=row.TipoPagamento,
        Parcelas=row.Parcelas,
        Desconto=_to_float(row.Desconto),
        Acrescimo=_to_float(row.Acrescimo),
        ValorFinal=_to_float(row.ValorFinal),
        DevedorIdExecutivo=row.DevedorIdExecutivo,
        Devedor=row.Devedor,
        StatusPagamento=row.StatusPagamento,
        StatusCobranca=row.StatusCobranca,
        Vencimento=row.Vencimento,
        DocumentoPath=row.DocumentoPath,
        URLCobranca=row.URLCobranca,
        Usuario=row.Usuario,
        Senha=row.Senha,
        Empresa=row.Empresa,
    )


@app.get("/api/contas-pagar", response_model=list[ContasPagarOut])
def list_contas_pagar(empresa: Optional[str] = None, db: Session = Depends(get_db)) -> list[ContasPagarOut]:
    stmt = select(ContasPagarModel)
    if empresa:
        stmt = stmt.where(ContasPagarModel.Empresa == empresa)
    rows = db.execute(stmt.order_by(ContasPagarModel.IdContasPagar.asc())).scalars().all()
    return [_as_out(r) for r in rows]


@app.get("/api/contas-pagar/{id_contas_pagar}", response_model=ContasPagarOut)
def get_contas_pagar(id_contas_pagar: int, db: Session = Depends(get_db)) -> ContasPagarOut:
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    return _as_out(row)


@app.post("/api/contas-pagar", response_model=ContasPagarOut, status_code=status.HTTP_201_CREATED)
def create_contas_pagar(payload: ContasPagarCreate, db: Session = Depends(get_db)) -> ContasPagarOut:
    data = payload.model_dump()
    tipo_pagamento = (data.get("TipoPagamento") or "").strip()
    parcelas = data.get("Parcelas")
    if tipo_pagamento.upper() in {"COTA UNICA", "COTA_UNICA", "COTAÚNICA", "COTA ÚNICA"}:
        data["TipoPagamento"] = "COTA_UNICA"
        data["Parcelas"] = 1
        parcelas = 1
    elif tipo_pagamento.upper() in {"PARCELAS", "PARCELA"}:
        data["TipoPagamento"] = "PARCELAS"

    if data.get("ValorFinal") is None:
        data["ValorFinal"] = _calc_valor_final(data.get("ValorOriginal"), parcelas, data.get("Desconto"), data.get("Acrescimo"))

    devedor_id = data.get("DevedorIdExecutivo")
    if devedor_id and not data.get("Devedor"):
        exec_row = db.get(ExecutivoModel, int(devedor_id))
        if exec_row:
            data["Devedor"] = exec_row.Executivo

    row = ContasPagarModel(**data)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar conta a pagar")
    db.refresh(row)
    return _as_out(row)


@app.put("/api/contas-pagar/{id_contas_pagar}", response_model=ContasPagarOut)
def update_contas_pagar(id_contas_pagar: int, payload: ContasPagarUpdate, db: Session = Depends(get_db)) -> ContasPagarOut:
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")

    data: dict[str, Any] = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(row, k, v)

    tipo_pagamento = (row.TipoPagamento or "").strip()
    if tipo_pagamento.upper() in {"COTA UNICA", "COTA_UNICA", "COTAÚNICA", "COTA ÚNICA"}:
        row.TipoPagamento = "COTA_UNICA"
        row.Parcelas = 1
    elif tipo_pagamento.upper() in {"PARCELAS", "PARCELA"}:
        row.TipoPagamento = "PARCELAS"

    if payload.ValorFinal is None and any(
        key in data for key in ("ValorOriginal", "Parcelas", "Desconto", "Acrescimo", "TipoPagamento")
    ):
        row.ValorFinal = _calc_valor_final(
            float(row.ValorOriginal) if row.ValorOriginal is not None else None,
            row.Parcelas,
            float(row.Desconto) if row.Desconto is not None else None,
            float(row.Acrescimo) if row.Acrescimo is not None else None,
        )

    if row.DevedorIdExecutivo and ("DevedorIdExecutivo" in data) and not row.Devedor:
        exec_row = db.get(ExecutivoModel, int(row.DevedorIdExecutivo))
        if exec_row:
            row.Devedor = exec_row.Executivo

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar conta a pagar")
    db.refresh(row)
    return _as_out(row)


@app.delete("/api/contas-pagar/{id_contas_pagar}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contas_pagar(id_contas_pagar: int, db: Session = Depends(get_db)) -> None:
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    db.delete(row)
    db.commit()


@app.post("/api/contas-pagar/{id_contas_pagar}/documento", response_model=ContasPagarOut)
async def upload_documento(
    id_contas_pagar: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ContasPagarOut:
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")

    original_name = file.filename or "documento"
    content = await file.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo muito grande")
    safe_name = _sanitize_segment(Path(original_name).name).replace(" ", "_") or "documento"
    media_id = _nestjs_upload_media(filename=safe_name, content_type=file.content_type, content=content)

    row.DocumentoPath = f"media:{media_id}"
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao salvar documento")
    db.refresh(row)
    return _as_out(row)


@app.post("/api/contas-pagar/{id_contas_pagar}/documento/baixar-url", response_model=ContasPagarOut)
def baixar_documento_url(id_contas_pagar: int, db: Session = Depends(get_db)) -> ContasPagarOut:
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    url = (row.URLCobranca or "").strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URLCobranca não informado")

    parsed_name = Path(urllib.parse.urlparse(url).path).name
    parsed_name = parsed_name or "documento"
    safe_name = _sanitize_segment(parsed_name).replace(" ", "_")

    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            content = resp.read()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao baixar documento do URLCobranca")

    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo muito grande")
    media_id = _nestjs_upload_media(filename=safe_name or "documento", content_type=None, content=content)

    row.DocumentoPath = f"media:{media_id}"
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao salvar documento")
    db.refresh(row)
    return _as_out(row)


@app.get("/api/contas-pagar/{id_contas_pagar}/documento")
def download_documento(id_contas_pagar: int, db: Session = Depends(get_db)):
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    if not row.DocumentoPath:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado")

    doc_ref = str(row.DocumentoPath).strip()
    if _is_media_ref(doc_ref):
        media_id = _media_id_from_ref(doc_ref)
        url = _nestjs_media_url(urllib.parse.quote(media_id))
        try:
            resp = urllib.request.urlopen(url, timeout=60)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao buscar documento no NestJS")
        except Exception:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao buscar documento no NestJS")

        headers: dict[str, str] = {}
        content_type = resp.headers.get("Content-Type") or "application/octet-stream"
        disp = resp.headers.get("Content-Disposition")
        if disp:
            headers["Content-Disposition"] = disp
        length = resp.headers.get("Content-Length")
        if length:
            headers["Content-Length"] = length
        return StreamingResponse(_stream_urlopen_response(resp), media_type=content_type, headers=headers)

    target_path = _resolve_document_path(doc_ref)
    if not target_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado")
    return FileResponse(path=str(target_path), filename=target_path.name)
