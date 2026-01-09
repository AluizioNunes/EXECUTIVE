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
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Column, Date, Integer, MetaData, Numeric, String, create_engine, delete, func, or_, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
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
    TenantId = Column("TenantId", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)


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
    TenantId = Column("TenantId", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)


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
    TenantId = Column("TenantId", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)


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
    TenantId = Column("TenantId", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)


class DepartamentoModel(Base):
    __tablename__ = "Departamentos"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdDepartamento = Column("IdDepartamento", Integer, primary_key=True, autoincrement=True, index=True)
    Departamento = Column("Departamento", String(255), nullable=False)
    Descricao = Column("Descricao", String(1000), nullable=True)
    IdTenant = Column("IdTenant", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)
    DataCadastro = Column("DataCadastro", Date, nullable=True, default=date.today)
    Cadastrante = Column("Cadastrante", String(255), nullable=True)


class FuncaoModel(Base):
    __tablename__ = "Funcoes"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdFuncao = Column("IdFuncao", Integer, primary_key=True, autoincrement=True, index=True)
    Funcao = Column("Funcao", String(255), nullable=False)
    Descricao = Column("Descricao", String(1000), nullable=True)
    Departamento = Column("Departamento", String(255), nullable=False)
    IdTenant = Column("IdTenant", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)
    DataCadastro = Column("DataCadastro", Date, nullable=True, default=date.today)
    Cadastrante = Column("Cadastrante", String(255), nullable=True)


class ColaboradorModel(Base):
    __tablename__ = "Colaboradores"
    __table_args__ = SCHEMA_TABLE_ARGS

    IdColaborador = Column("IdColaborador", Integer, primary_key=True, autoincrement=True, index=True)
    Colaborador = Column("Colaborador", String(255), nullable=False)
    Descricao = Column("Descricao", String(1000), nullable=True)
    Funcao = Column("Funcao", String(255), nullable=False)
    IdTenant = Column("IdTenant", Integer, nullable=True, index=True)
    Tenant = Column("Tenant", String(255), nullable=True)
    DataCadastro = Column("DataCadastro", Date, nullable=True, default=date.today)
    Cadastrante = Column("Cadastrante", String(255), nullable=True)


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
                existing_en.Ativo = 0
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


def _ensure_executivos_tenant_columns_executive_db() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.connect() as conn:
            cols_rows = conn.execute(
                text("select column_name from information_schema.columns where table_schema=:s and table_name=:t"),
                {"s": SCHEMA_NAME, "t": "Executivos"},
            ).fetchall()
            existing = {str(r[0]) for r in cols_rows}

            statements: list[str] = []
            if "TenantId" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Executivos" ADD COLUMN "TenantId" INTEGER')
            if "Tenant" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Executivos" ADD COLUMN "Tenant" VARCHAR(255)')
            for stmt in statements:
                conn.exec_driver_sql(stmt)
            if statements:
                conn.commit()

            conn.execute(
                text(
                    f"""
                    update "{SCHEMA_NAME}"."Executivos" e
                    set "TenantId" = t."IdTenant",
                        "Tenant" = t."Tenant"
                    from "{SCHEMA_NAME}"."Tenants" t
                    where lower(e."Empresa") = lower(t."Tenant")
                      and (
                        e."TenantId" is null
                        or e."TenantId" = 0
                        or e."Tenant" is null
                        or btrim(e."Tenant") = ''
                      )
                    """
                )
            )
            conn.commit()

            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_Executivos_TenantId" ON "{SCHEMA_NAME}"."Executivos" ("TenantId")')
            conn.commit()
    except Exception:
        return


def _ensure_executivos_tenant_columns_tenant_db(*, db_name: str, tenant_id: int, tenant_name: str) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        tenant_engine = _tenant_engine(db_name=_sanitize_db_name(db_name))
        with tenant_engine.connect() as conn:
            cols_rows = conn.execute(
                text("select column_name from information_schema.columns where table_schema=:s and table_name=:t"),
                {"s": SCHEMA_NAME, "t": "Executivos"},
            ).fetchall()
            existing = {str(r[0]) for r in cols_rows}

            statements: list[str] = []
            if "TenantId" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Executivos" ADD COLUMN "TenantId" INTEGER')
            if "Tenant" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."Executivos" ADD COLUMN "Tenant" VARCHAR(255)')
            for stmt in statements:
                conn.exec_driver_sql(stmt)
            if statements:
                conn.commit()

            conn.execute(
                text(
                    f"""
                    update "{SCHEMA_NAME}"."Executivos"
                    set "TenantId" = :tenant_id,
                        "Tenant" = :tenant_name
                    where "TenantId" is null
                       or "TenantId" = 0
                       or "Tenant" is null
                       or btrim("Tenant") = ''
                    """
                ),
                {"tenant_id": int(tenant_id), "tenant_name": str(tenant_name or "").strip()},
            )
            conn.commit()

            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_Executivos_TenantId" ON "{SCHEMA_NAME}"."Executivos" ("TenantId")')
            conn.commit()
    except Exception:
        return


def _ensure_executivos_tenant_columns_all_databases() -> None:
    try:
        _ensure_executivos_tenant_columns_executive_db()
        with SessionLocal() as db:
            tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
        for t in tenants:
            if str(t.Slug or "").strip().lower() == "executive":
                continue
            db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))
            _ensure_executivos_tenant_columns_tenant_db(db_name=db_name, tenant_id=int(t.IdTenant), tenant_name=str(t.Tenant or "").strip())
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


def _ensure_table_tenant_columns_executive_db(*, table: str, tenant_name_column: str = "Empresa") -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.connect() as conn:
            cols_rows = conn.execute(
                text("select column_name from information_schema.columns where table_schema=:s and table_name=:t"),
                {"s": SCHEMA_NAME, "t": table},
            ).fetchall()
            existing = {str(r[0]) for r in cols_rows}

            statements: list[str] = []
            if "TenantId" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."{table}" ADD COLUMN "TenantId" INTEGER')
            if "Tenant" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."{table}" ADD COLUMN "Tenant" VARCHAR(255)')
            for stmt in statements:
                conn.exec_driver_sql(stmt)
            if statements:
                conn.commit()

            conn.execute(
                text(
                    f"""
                    update "{SCHEMA_NAME}"."{table}" r
                    set "TenantId" = t."IdTenant",
                        "Tenant" = t."Tenant"
                    from "{SCHEMA_NAME}"."Tenants" t
                    where lower(r."{tenant_name_column}") = lower(t."Tenant")
                      and (
                        r."TenantId" is null
                        or r."TenantId" = 0
                        or r."Tenant" is null
                        or btrim(r."Tenant") = ''
                      )
                    """
                )
            )
            conn.commit()

            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_{table}_TenantId" ON "{SCHEMA_NAME}"."{table}" ("TenantId")')
            conn.commit()
    except Exception:
        return


def _ensure_table_tenant_columns_tenant_db(*, db_name: str, table: str, tenant_id: int, tenant_name: str) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        tenant_engine = _tenant_engine(db_name=_sanitize_db_name(db_name))
        with tenant_engine.connect() as conn:
            cols_rows = conn.execute(
                text("select column_name from information_schema.columns where table_schema=:s and table_name=:t"),
                {"s": SCHEMA_NAME, "t": table},
            ).fetchall()
            existing = {str(r[0]) for r in cols_rows}

            statements: list[str] = []
            if "TenantId" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."{table}" ADD COLUMN "TenantId" INTEGER')
            if "Tenant" not in existing:
                statements.append(f'ALTER TABLE "{SCHEMA_NAME}"."{table}" ADD COLUMN "Tenant" VARCHAR(255)')
            for stmt in statements:
                conn.exec_driver_sql(stmt)
            if statements:
                conn.commit()

            conn.execute(
                text(
                    f"""
                    update "{SCHEMA_NAME}"."{table}"
                    set "TenantId" = :tenant_id,
                        "Tenant" = :tenant_name
                    where "TenantId" is null
                       or "TenantId" = 0
                       or "Tenant" is null
                       or btrim("Tenant") = ''
                    """
                ),
                {"tenant_id": int(tenant_id), "tenant_name": str(tenant_name or "").strip()},
            )
            conn.commit()

            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_{table}_TenantId" ON "{SCHEMA_NAME}"."{table}" ("TenantId")')
            conn.commit()
    except Exception:
        return


def _ensure_gestao_interna_tables_in_engine(*, engine_to_use: Engine) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine_to_use.connect() as conn:
            conn.exec_driver_sql(f'CREATE SCHEMA IF NOT EXISTS "{SCHEMA_NAME}"')

            conn.exec_driver_sql(
                f"""
                CREATE TABLE IF NOT EXISTS "{SCHEMA_NAME}"."Departamentos" (
                    "IdDepartamento" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "Departamento" VARCHAR(255) NOT NULL,
                    "Descricao" VARCHAR(1000) NULL,
                    "IdTenant" INTEGER NULL,
                    "Tenant" VARCHAR(255) NULL,
                    "DataCadastro" DATE NULL,
                    "Cadastrante" VARCHAR(255) NULL
                )
                """
            )
            conn.exec_driver_sql(
                f"""
                CREATE TABLE IF NOT EXISTS "{SCHEMA_NAME}"."Funcoes" (
                    "IdFuncao" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "Funcao" VARCHAR(255) NOT NULL,
                    "Descricao" VARCHAR(1000) NULL,
                    "Departamento" VARCHAR(255) NOT NULL,
                    "IdTenant" INTEGER NULL,
                    "Tenant" VARCHAR(255) NULL,
                    "DataCadastro" DATE NULL,
                    "Cadastrante" VARCHAR(255) NULL
                )
                """
            )
            conn.exec_driver_sql(
                f"""
                CREATE TABLE IF NOT EXISTS "{SCHEMA_NAME}"."Colaboradores" (
                    "IdColaborador" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "Colaborador" VARCHAR(255) NOT NULL,
                    "Descricao" VARCHAR(1000) NULL,
                    "Funcao" VARCHAR(255) NOT NULL,
                    "IdTenant" INTEGER NULL,
                    "Tenant" VARCHAR(255) NULL,
                    "DataCadastro" DATE NULL,
                    "Cadastrante" VARCHAR(255) NULL
                )
                """
            )

            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_Departamentos_IdTenant" ON "{SCHEMA_NAME}"."Departamentos" ("IdTenant")')
            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_Funcoes_IdTenant" ON "{SCHEMA_NAME}"."Funcoes" ("IdTenant")')
            conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_Colaboradores_IdTenant" ON "{SCHEMA_NAME}"."Colaboradores" ("IdTenant")')
            conn.commit()
    except Exception:
        return


def _ensure_gestao_interna_tables_for_auth(*, tenant_id: int, tenant_slug: str) -> None:
    safe_slug = str(tenant_slug or "").strip().lower()
    if tenant_id <= 0 or not safe_slug:
        return
    db_name = _tenant_db_name_for_auth(tenant_id=int(tenant_id), tenant_slug=safe_slug)
    if safe_slug == "executive":
        _ensure_gestao_interna_tables_in_engine(engine_to_use=engine)
        return
    tenant_engine = _tenant_engine(db_name=_sanitize_db_name(db_name))
    _ensure_gestao_interna_tables_in_engine(engine_to_use=tenant_engine)


def _ensure_gestao_interna_tables_all_databases() -> None:
    try:
        _ensure_gestao_interna_tables_in_engine(engine_to_use=engine)
        with SessionLocal() as db:
            tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
        for t in tenants:
            if str(t.Slug or "").strip().lower() == "executive":
                continue
            tenant_engine = _tenant_engine(db_name=_sanitize_db_name(_tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))))
            _ensure_gestao_interna_tables_in_engine(engine_to_use=tenant_engine)
    except Exception:
        return


def _gestao_interna_tables_exist_in_engine(*, engine_to_use: Engine) -> bool:
    if not DATABASE_URL.startswith("postgresql"):
        return False
    try:
        with engine_to_use.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    select table_name
                    from information_schema.tables
                    where table_schema = :s
                      and table_name in ('Departamentos', 'Funcoes', 'Colaboradores')
                    """
                ),
                {"s": SCHEMA_NAME},
            ).fetchall()
            existing = {str(r[0]) for r in rows}
            return {"Departamentos", "Funcoes", "Colaboradores"}.issubset(existing)
    except Exception:
        return False


def _ensure_tenant_columns_all_databases() -> None:
    try:
        _ensure_table_tenant_columns_executive_db(table="Ativos", tenant_name_column="Empresa")
        _ensure_table_tenant_columns_executive_db(table="ContasPagar", tenant_name_column="Empresa")
        _ensure_table_tenant_columns_executive_db(table="CentroCustos", tenant_name_column="Empresa")

        with SessionLocal() as db:
            tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()

        for t in tenants:
            if str(t.Slug or "").strip().lower() == "executive":
                continue
            db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))
            tenant_name = str(t.Tenant or "").strip()
            _ensure_table_tenant_columns_tenant_db(db_name=db_name, table="Ativos", tenant_id=int(t.IdTenant), tenant_name=tenant_name)
            _ensure_table_tenant_columns_tenant_db(db_name=db_name, table="ContasPagar", tenant_id=int(t.IdTenant), tenant_name=tenant_name)
            _ensure_table_tenant_columns_tenant_db(db_name=db_name, table="CentroCustos", tenant_id=int(t.IdTenant), tenant_name=tenant_name)
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
_ensure_gestao_interna_tables_all_databases()
_ensure_default_tenant_executive()
_ensure_default_admin_user()
_ensure_executivos_tenant_columns_all_databases()
_ensure_tenant_columns_all_databases()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


_DEFAULT_DATABASE_NAME = str(make_url(DATABASE_URL).database or "").strip() or "postgres"
_TENANT_SESSIONMAKERS: dict[str, sessionmaker] = {}
_TENANT_DB_TENANT_COLUMNS_ENSURED: set[str] = set()


def _tenant_db_name_for_auth(*, tenant_id: int, tenant_slug: str) -> str:
    if str(tenant_slug or "").strip().lower() == "executive":
        return _DEFAULT_DATABASE_NAME
    return _tenant_db_name(tenant_id=int(tenant_id), slug=str(tenant_slug))


def _tenant_sessionmaker(db_name: str) -> sessionmaker:
    safe_db = _sanitize_db_name(db_name)
    existing = _TENANT_SESSIONMAKERS.get(safe_db)
    if existing is not None:
        return existing
    tenant_engine = _tenant_engine(db_name=safe_db)
    TenantSession = sessionmaker(bind=tenant_engine, autoflush=False, autocommit=False)
    _TENANT_SESSIONMAKERS[safe_db] = TenantSession
    return TenantSession


def _ensure_tenant_columns_for_auth(*, tenant_id: int, tenant_slug: str) -> None:
    safe_slug = str(tenant_slug or "").strip().lower()
    if tenant_id <= 0 or not safe_slug:
        return

    db_name = _tenant_db_name_for_auth(tenant_id=int(tenant_id), tenant_slug=safe_slug)
    safe_db = _sanitize_db_name(db_name)

    if safe_db in _TENANT_DB_TENANT_COLUMNS_ENSURED:
        return

    if not DATABASE_URL.startswith("postgresql"):
        _TENANT_DB_TENANT_COLUMNS_ENSURED.add(safe_db)
        return

    if safe_slug == "executive":
        _ensure_executivos_tenant_columns_executive_db()
        _ensure_table_tenant_columns_executive_db(table="Ativos", tenant_name_column="Empresa")
        _ensure_table_tenant_columns_executive_db(table="ContasPagar", tenant_name_column="Empresa")
        _ensure_table_tenant_columns_executive_db(table="CentroCustos", tenant_name_column="Empresa")
        _ensure_gestao_interna_tables_for_auth(tenant_id=int(tenant_id), tenant_slug=safe_slug)
        _TENANT_DB_TENANT_COLUMNS_ENSURED.add(safe_db)
        return

    tenant_name = _tenant_name_from_id(int(tenant_id)) or safe_slug
    _ensure_executivos_tenant_columns_tenant_db(db_name=safe_db, tenant_id=int(tenant_id), tenant_name=str(tenant_name))
    _ensure_table_tenant_columns_tenant_db(db_name=safe_db, table="Ativos", tenant_id=int(tenant_id), tenant_name=str(tenant_name))
    _ensure_table_tenant_columns_tenant_db(db_name=safe_db, table="ContasPagar", tenant_id=int(tenant_id), tenant_name=str(tenant_name))
    _ensure_table_tenant_columns_tenant_db(db_name=safe_db, table="CentroCustos", tenant_id=int(tenant_id), tenant_name=str(tenant_name))
    _ensure_gestao_interna_tables_for_auth(tenant_id=int(tenant_id), tenant_slug=safe_slug)
    _TENANT_DB_TENANT_COLUMNS_ENSURED.add(safe_db)

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
    TenantId: Optional[int] = None
    Tenant: Optional[str] = None


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
    TenantId: Optional[int] = None
    Tenant: Optional[str] = None


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
    TenantId: Optional[int] = None
    Tenant: Optional[str] = None


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
    TenantId: Optional[int] = None
    Tenant: Optional[str] = None


class DepartamentoCreate(BaseModel):
    Departamento: str = Field(min_length=1, max_length=255)
    Descricao: Optional[str] = Field(default=None, max_length=1000)


class DepartamentoUpdate(BaseModel):
    Departamento: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Descricao: Optional[str] = Field(default=None, max_length=1000)


class DepartamentoOut(BaseModel):
    IdDepartamento: int
    Departamento: str
    Descricao: Optional[str] = None
    IdTenant: Optional[int] = None
    Tenant: Optional[str] = None
    DataCadastro: Optional[date] = None
    Cadastrante: Optional[str] = None


class FuncaoCreate(BaseModel):
    Funcao: str = Field(min_length=1, max_length=255)
    Descricao: Optional[str] = Field(default=None, max_length=1000)
    Departamento: str = Field(min_length=1, max_length=255)


class FuncaoUpdate(BaseModel):
    Funcao: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Descricao: Optional[str] = Field(default=None, max_length=1000)
    Departamento: Optional[str] = Field(default=None, min_length=1, max_length=255)


class FuncaoOut(BaseModel):
    IdFuncao: int
    Funcao: str
    Descricao: Optional[str] = None
    Departamento: str
    IdTenant: Optional[int] = None
    Tenant: Optional[str] = None
    DataCadastro: Optional[date] = None
    Cadastrante: Optional[str] = None


class ColaboradorCreate(BaseModel):
    Colaborador: str = Field(min_length=1, max_length=255)
    Descricao: Optional[str] = Field(default=None, max_length=1000)
    Funcao: str = Field(min_length=1, max_length=255)


class ColaboradorUpdate(BaseModel):
    Colaborador: Optional[str] = Field(default=None, min_length=1, max_length=255)
    Descricao: Optional[str] = Field(default=None, max_length=1000)
    Funcao: Optional[str] = Field(default=None, min_length=1, max_length=255)


class ColaboradorOut(BaseModel):
    IdColaborador: int
    Colaborador: str
    Descricao: Optional[str] = None
    Funcao: str
    IdTenant: Optional[int] = None
    Tenant: Optional[str] = None
    DataCadastro: Optional[date] = None
    Cadastrante: Optional[str] = None


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


def get_tenant_db(auth: dict[str, Any] = Depends(_require_auth)) -> Session:
    tenant_id = int(auth.get("tenant_id") or 0)
    tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    if tenant_id <= 0 or not tenant_slug:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

    try:
        _ensure_tenant_columns_for_auth(tenant_id=tenant_id, tenant_slug=tenant_slug)
    except HTTPException:
        raise
    except Exception as e:
        msg = str(getattr(e, "orig", None) or e or "").strip()
        msg = re.sub(r"\s+", " ", msg).strip()
        if not msg:
            msg = str(e.__class__.__name__)
        if len(msg) > 240:
            msg = msg[:240].rstrip() + "..."
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Falha ao preparar banco do tenant: {msg}")

    db_name = _tenant_db_name_for_auth(tenant_id=tenant_id, tenant_slug=tenant_slug)
    TenantSession = _tenant_sessionmaker(db_name)
    db = TenantSession()
    try:
        yield db
    finally:
        db.close()


def _tenant_name_from_id(tenant_id: int) -> Optional[str]:
    try:
        with SessionLocal() as db:
            row = db.get(TenantsModel, int(tenant_id))
            if not row:
                return None
            name = str(row.Tenant or "").strip()
            return name if name else None
    except Exception:
        return None


def _tenant_meta_from_id(tenant_id: int) -> Optional[tuple[int, str, str]]:
    try:
        with SessionLocal() as db:
            row = db.get(TenantsModel, int(tenant_id))
            if not row:
                return None
            tid = int(row.IdTenant)
            slug = str(row.Slug or "").strip().lower()
            name = str(row.Tenant or "").strip()
            if not slug:
                return None
            return (tid, slug, name)
    except Exception:
        return None


@contextmanager
def _target_tenant_session(
    *,
    db: Session,
    auth: dict[str, Any],
    tenant_id: Optional[int],
) -> Session:
    if tenant_id is None or not (_is_superadmin(auth) or _is_executive_tenant(auth)):
        yield db
        return

    tid = int(tenant_id or 0)
    if tid <= 0:
        yield db
        return

    meta = _tenant_meta_from_id(tid)
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")
    target_id, target_slug, _target_name = meta
    if target_slug == "executive":
        yield db
        return

    _ensure_tenant_columns_for_auth(tenant_id=target_id, tenant_slug=target_slug)
    db_name = _tenant_db_name(tenant_id=target_id, slug=target_slug)
    TenantSession = _tenant_sessionmaker(db_name)
    with TenantSession() as tdb:
        yield tdb


app = FastAPI(title="Executive API", version="0.1.0")

def _cors_origins() -> list[str]:
    defaults = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    }
    raw = os.getenv("CORS_ORIGINS")
    if raw is None or not str(raw).strip():
        return sorted(defaults)
    if str(raw).strip() == "*":
        return ["*"]
    origins = set(defaults)
    origins.update({o.strip() for o in str(raw).split(",") if o.strip()})
    return sorted(origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=0,
)


@app.on_event("startup")
def _startup_ensure_gestao_interna_tables() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return

    max_wait = int(os.getenv("STARTUP_DB_WAIT_SECONDS") or "60")
    deadline = time.time() + max(0, max_wait)
    backoff = 1.0

    while True:
        try:
            with engine.connect() as conn:
                conn.execute(text("select 1"))
        except OperationalError:
            if time.time() >= deadline:
                return
            time.sleep(backoff)
            backoff = min(backoff * 1.5, 5.0)
            continue
        except Exception:
            if time.time() >= deadline:
                return
            time.sleep(backoff)
            backoff = min(backoff * 1.5, 5.0)
            continue

        _ensure_gestao_interna_tables_all_databases()

        ok_exec = _gestao_interna_tables_exist_in_engine(engine_to_use=engine)
        ok_tenants = True
        try:
            with SessionLocal() as db:
                tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
            for t in tenants:
                slug = str(t.Slug or "").strip().lower()
                if slug == "executive":
                    continue
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=slug)
                tenant_engine = _tenant_engine(db_name=_sanitize_db_name(db_name))
                if not _gestao_interna_tables_exist_in_engine(engine_to_use=tenant_engine):
                    ok_tenants = False
        except Exception:
            ok_tenants = False

        if ok_exec and ok_tenants:
            return
        if time.time() >= deadline:
            return
        time.sleep(backoff)
        backoff = min(backoff * 1.5, 5.0)


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
    empresa: Optional[str] = None,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[ExecutivoOut]:
    empresa_in = empresa.strip() if isinstance(empresa, str) and empresa.strip() else None
    if _is_executive_tenant(auth) and empresa_in and empresa_in.strip().lower() == "executive":
        empresa_in = None

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        stmt_tenants = select(TenantsModel)
        if empresa_in:
            stmt_tenants = stmt_tenants.where(or_(TenantsModel.Tenant == empresa_in, TenantsModel.Slug == empresa_in.lower()))
        tenants = db.execute(stmt_tenants.order_by(TenantsModel.IdTenant.asc())).scalars().all()

        out: list[ExecutivoOut] = []
        for t in tenants:
            _ensure_tenant_columns_for_auth(tenant_id=int(t.IdTenant), tenant_slug=str(t.Slug or ""))
            if str(t.Slug or "").lower() == "executive":
                stmt = select(ExecutivoModel).where(ExecutivoModel.Empresa == str(t.Tenant)).order_by(ExecutivoModel.IdExecutivo.asc())
                rows = db.execute(stmt).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    stmt = select(ExecutivoModel).order_by(ExecutivoModel.IdExecutivo.asc())
                    rows = tdb.execute(stmt).scalars().all()
            out.extend(
                [
                    ExecutivoOut(
                        IdExecutivo=r.IdExecutivo,
                        Executivo=r.Executivo,
                        Funcao=r.Funcao,
                        Perfil=r.Perfil,
                        Empresa=r.Empresa,
                        TenantId=getattr(r, "TenantId", None),
                        Tenant=getattr(r, "Tenant", None),
                    )
                    for r in rows
                ]
            )

        out.sort(key=lambda r: (str(r.Empresa or ""), int(r.IdExecutivo or 0)))
        return out

    stmt = select(ExecutivoModel).order_by(ExecutivoModel.IdExecutivo.asc())
    rows = db.execute(stmt).scalars().all()
    return [
        ExecutivoOut(
            IdExecutivo=r.IdExecutivo,
            Executivo=r.Executivo,
            Funcao=r.Funcao,
            Perfil=r.Perfil,
            Empresa=r.Empresa,
            TenantId=getattr(r, "TenantId", None),
            Tenant=getattr(r, "Tenant", None),
        )
        for r in rows
    ]


@app.get("/api/executivos/{id_executivo}", response_model=ExecutivoOut)
def get_executivo(
    id_executivo: int,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ExecutivoOut:
    row = db.get(ExecutivoModel, id_executivo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Executivo não encontrado")
    return ExecutivoOut(
        IdExecutivo=row.IdExecutivo,
        Executivo=row.Executivo,
        Funcao=row.Funcao,
        Perfil=row.Perfil,
        Empresa=row.Empresa,
        TenantId=getattr(row, "TenantId", None),
        Tenant=getattr(row, "Tenant", None),
    )


@app.post("/api/executivos", response_model=ExecutivoOut, status_code=status.HTTP_201_CREATED)
def create_executivo(
    payload: ExecutivoCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ExecutivoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = ExecutivoModel(
            Executivo=payload.Executivo.strip(),
            Funcao=payload.Funcao.strip(),
            Perfil=payload.Perfil.strip(),
            Empresa=payload.Empresa.strip(),
            TenantId=target_tenant_id if target_tenant_id > 0 else None,
            Tenant=tenant_name,
        )
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar executivo")
        tdb.refresh(row)
    return ExecutivoOut(
        IdExecutivo=row.IdExecutivo,
        Executivo=row.Executivo,
        Funcao=row.Funcao,
        Perfil=row.Perfil,
        Empresa=row.Empresa,
        TenantId=getattr(row, "TenantId", None),
        Tenant=getattr(row, "Tenant", None),
    )


@app.put("/api/executivos/{id_executivo}", response_model=ExecutivoOut)
def update_executivo(
    id_executivo: int,
    payload: ExecutivoUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ExecutivoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ExecutivoModel, id_executivo)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Executivo não encontrado")

        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if v is None:
                continue
            setattr(row, k, v.strip() if isinstance(v, str) else v)

        if target_tenant_id > 0 and (getattr(row, "TenantId", None) is None or int(getattr(row, "TenantId") or 0) == 0):
            row.TenantId = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name

        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar executivo")
        tdb.refresh(row)
    return ExecutivoOut(
        IdExecutivo=row.IdExecutivo,
        Executivo=row.Executivo,
        Funcao=row.Funcao,
        Perfil=row.Perfil,
        Empresa=row.Empresa,
        TenantId=getattr(row, "TenantId", None),
        Tenant=getattr(row, "Tenant", None),
    )


@app.delete("/api/executivos/{id_executivo}", status_code=status.HTTP_204_NO_CONTENT)
def delete_executivo(
    id_executivo: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ExecutivoModel, id_executivo)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Executivo não encontrado")
        tdb.delete(row)
        tdb.commit()


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
        TenantId=getattr(row, "TenantId", None),
        Tenant=getattr(row, "Tenant", None),
    )


@app.get("/api/ativos", response_model=list[AtivoOut])
def list_ativos(
    empresa: Optional[str] = None,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[AtivoOut]:
    empresa_in = empresa.strip() if isinstance(empresa, str) and empresa.strip() else None
    if _is_executive_tenant(auth) and empresa_in and empresa_in.strip().lower() == "executive":
        empresa_in = None

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        stmt_tenants = select(TenantsModel)
        if empresa_in:
            stmt_tenants = stmt_tenants.where(or_(TenantsModel.Tenant == empresa_in, TenantsModel.Slug == empresa_in.lower()))
        tenants = db.execute(stmt_tenants.order_by(TenantsModel.IdTenant.asc())).scalars().all()

        out: list[AtivoOut] = []
        for t in tenants:
            _ensure_tenant_columns_for_auth(tenant_id=int(t.IdTenant), tenant_slug=str(t.Slug or ""))
            if str(t.Slug or "").lower() == "executive":
                stmt = select(AtivoModel).where(AtivoModel.Empresa == str(t.Tenant)).order_by(AtivoModel.IdAtivo.asc())
                rows = db.execute(stmt).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    stmt = select(AtivoModel).order_by(AtivoModel.IdAtivo.asc())
                    rows = tdb.execute(stmt).scalars().all()
            out.extend([_ativo_as_out(r) for r in rows])

        out.sort(key=lambda r: (str(r.Empresa or ""), int(r.IdAtivo or 0)))
        return out

    stmt = select(AtivoModel).order_by(AtivoModel.IdAtivo.asc())
    rows = db.execute(stmt).scalars().all()
    return [_ativo_as_out(r) for r in rows]


@app.get("/api/ativos/{id_ativo}", response_model=AtivoOut)
def get_ativo(
    id_ativo: int,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> AtivoOut:
    row = db.get(AtivoModel, id_ativo)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado")
    return _ativo_as_out(row)


@app.post("/api/ativos", response_model=AtivoOut, status_code=status.HTTP_201_CREATED)
def create_ativo(
    payload: AtivoCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> AtivoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
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
            TenantId=target_tenant_id if target_tenant_id > 0 else None,
            Tenant=tenant_name,
        )
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar ativo")
        tdb.refresh(row)
        return _ativo_as_out(row)


@app.put("/api/ativos/{id_ativo}", response_model=AtivoOut)
def update_ativo(
    id_ativo: int,
    payload: AtivoUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> AtivoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(AtivoModel, id_ativo)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado")

        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip()
            setattr(row, k, v)

        if target_tenant_id > 0 and (getattr(row, "TenantId", None) is None or int(getattr(row, "TenantId") or 0) == 0):
            row.TenantId = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name

        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar ativo")
        tdb.refresh(row)
        return _ativo_as_out(row)


@app.delete("/api/ativos/{id_ativo}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ativo(
    id_ativo: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(AtivoModel, id_ativo)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado")
        tdb.delete(row)
        tdb.commit()


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
        TenantId=getattr(row, "TenantId", None),
        Tenant=getattr(row, "Tenant", None),
    )


@app.get("/api/centro-custos", response_model=list[CentroCustosOut])
def list_centro_custos(
    empresa: Optional[str] = None,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[CentroCustosOut]:
    empresa_in = empresa.strip() if isinstance(empresa, str) and empresa.strip() else None
    if _is_executive_tenant(auth) and empresa_in and empresa_in.strip().lower() == "executive":
        empresa_in = None

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        stmt_tenants = select(TenantsModel)
        if empresa_in:
            stmt_tenants = stmt_tenants.where(or_(TenantsModel.Tenant == empresa_in, TenantsModel.Slug == empresa_in.lower()))
        tenants = db.execute(stmt_tenants.order_by(TenantsModel.IdTenant.asc())).scalars().all()

        out: list[CentroCustosOut] = []
        for t in tenants:
            _ensure_tenant_columns_for_auth(tenant_id=int(t.IdTenant), tenant_slug=str(t.Slug or ""))
            if str(t.Slug or "").lower() == "executive":
                stmt = (
                    select(CentroCustosModel)
                    .where(CentroCustosModel.Empresa == str(t.Tenant))
                    .order_by(CentroCustosModel.IdCustos.asc())
                )
                rows = db.execute(stmt).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    stmt = select(CentroCustosModel).order_by(CentroCustosModel.IdCustos.asc())
                    rows = tdb.execute(stmt).scalars().all()
            out.extend([_centro_custos_as_out(r) for r in rows])

        out.sort(key=lambda r: (str(r.Empresa or ""), int(r.IdCustos or 0)))
        return out

    stmt = select(CentroCustosModel).order_by(CentroCustosModel.IdCustos.asc())
    rows = db.execute(stmt).scalars().all()
    return [_centro_custos_as_out(r) for r in rows]


@app.get("/api/centro-custos/{id_custos}", response_model=CentroCustosOut)
def get_centro_custos(
    id_custos: int,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> CentroCustosOut:
    row = db.get(CentroCustosModel, id_custos)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de custos não encontrado")
    return _centro_custos_as_out(row)


@app.post("/api/centro-custos", response_model=CentroCustosOut, status_code=status.HTTP_201_CREATED)
def create_centro_custos(
    payload: CentroCustosCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> CentroCustosOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = CentroCustosModel(
            CodigoInterno=payload.CodigoInterno.strip() if isinstance(payload.CodigoInterno, str) else None,
            Classe=payload.Classe.strip() if isinstance(payload.Classe, str) else None,
            Nome=payload.Nome.strip(),
            Cidade=payload.Cidade.strip() if isinstance(payload.Cidade, str) else None,
            UF=payload.UF.strip() if isinstance(payload.UF, str) else None,
            Empresa=payload.Empresa.strip(),
            Departamento=payload.Departamento.strip() if isinstance(payload.Departamento, str) else None,
            Responsavel=payload.Responsavel.strip() if isinstance(payload.Responsavel, str) else None,
            TenantId=target_tenant_id if target_tenant_id > 0 else None,
            Tenant=tenant_name,
        )
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar centro de custos")
        tdb.refresh(row)
        return _centro_custos_as_out(row)


@app.put("/api/centro-custos/{id_custos}", response_model=CentroCustosOut)
def update_centro_custos(
    id_custos: int,
    payload: CentroCustosUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> CentroCustosOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(CentroCustosModel, id_custos)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de custos não encontrado")

        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip()
            setattr(row, k, v)

        if target_tenant_id > 0 and (getattr(row, "TenantId", None) is None or int(getattr(row, "TenantId") or 0) == 0):
            row.TenantId = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name

        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar centro de custos")
        tdb.refresh(row)
        return _centro_custos_as_out(row)


@app.delete("/api/centro-custos/{id_custos}", status_code=status.HTTP_204_NO_CONTENT)
def delete_centro_custos(
    id_custos: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(CentroCustosModel, id_custos)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro de custos não encontrado")
        tdb.delete(row)
        tdb.commit()


def _departamento_as_out(row: DepartamentoModel) -> DepartamentoOut:
    return DepartamentoOut(
        IdDepartamento=row.IdDepartamento,
        Departamento=row.Departamento,
        Descricao=row.Descricao,
        IdTenant=getattr(row, "IdTenant", None),
        Tenant=getattr(row, "Tenant", None),
        DataCadastro=getattr(row, "DataCadastro", None),
        Cadastrante=getattr(row, "Cadastrante", None),
    )


def _funcao_as_out(row: FuncaoModel) -> FuncaoOut:
    return FuncaoOut(
        IdFuncao=row.IdFuncao,
        Funcao=row.Funcao,
        Descricao=row.Descricao,
        Departamento=row.Departamento,
        IdTenant=getattr(row, "IdTenant", None),
        Tenant=getattr(row, "Tenant", None),
        DataCadastro=getattr(row, "DataCadastro", None),
        Cadastrante=getattr(row, "Cadastrante", None),
    )


def _colaborador_as_out(row: ColaboradorModel) -> ColaboradorOut:
    return ColaboradorOut(
        IdColaborador=row.IdColaborador,
        Colaborador=row.Colaborador,
        Descricao=row.Descricao,
        Funcao=row.Funcao,
        IdTenant=getattr(row, "IdTenant", None),
        Tenant=getattr(row, "Tenant", None),
        DataCadastro=getattr(row, "DataCadastro", None),
        Cadastrante=getattr(row, "Cadastrante", None),
    )


@app.get("/api/departamentos", response_model=list[DepartamentoOut])
def list_departamentos(
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[DepartamentoOut]:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    auth_tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    _ensure_gestao_interna_tables_for_auth(tenant_id=auth_tenant_id, tenant_slug=auth_tenant_slug)

    if (_is_superadmin(auth) or _is_executive_tenant(auth)) and tenant_id is not None:
        with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
            rows = tdb.execute(select(DepartamentoModel).order_by(DepartamentoModel.IdDepartamento.asc())).scalars().all()
            return [_departamento_as_out(r) for r in rows]

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
        out: list[DepartamentoOut] = []
        for t in tenants:
            slug = str(t.Slug or "").strip().lower()
            _ensure_gestao_interna_tables_for_auth(tenant_id=int(t.IdTenant), tenant_slug=slug)
            if slug == "executive":
                rows = db.execute(select(DepartamentoModel).order_by(DepartamentoModel.IdDepartamento.asc())).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=slug)
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    rows = tdb.execute(select(DepartamentoModel).order_by(DepartamentoModel.IdDepartamento.asc())).scalars().all()
            out.extend([_departamento_as_out(r) for r in rows])
        out.sort(key=lambda r: (str(r.Tenant or ""), int(r.IdDepartamento or 0)))
        return out

    rows = db.execute(select(DepartamentoModel).order_by(DepartamentoModel.IdDepartamento.asc())).scalars().all()
    return [_departamento_as_out(r) for r in rows]


@app.get("/api/departamentos/{id_departamento}", response_model=DepartamentoOut)
def get_departamento(
    id_departamento: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> DepartamentoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    auth_tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    _ensure_gestao_interna_tables_for_auth(tenant_id=auth_tenant_id, tenant_slug=auth_tenant_slug)
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(DepartamentoModel, id_departamento)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento não encontrado")
        return _departamento_as_out(row)


@app.post("/api/departamentos", response_model=DepartamentoOut, status_code=status.HTTP_201_CREATED)
def create_departamento(
    payload: DepartamentoCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> DepartamentoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_slug = (target_meta[1] if target_meta else None) or str(auth.get("tenant_slug") or "").strip().lower()
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or tenant_slug or None
    _ensure_gestao_interna_tables_for_auth(tenant_id=target_tenant_id, tenant_slug=tenant_slug)

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = DepartamentoModel(
            Departamento=payload.Departamento.strip(),
            Descricao=payload.Descricao.strip() if isinstance(payload.Descricao, str) else None,
            IdTenant=target_tenant_id if target_tenant_id > 0 else None,
            Tenant=tenant_name,
            DataCadastro=date.today(),
            Cadastrante=str(auth.get("nome") or auth.get("usuario") or "").strip() or None,
        )
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar departamento")
        tdb.refresh(row)
        return _departamento_as_out(row)


@app.put("/api/departamentos/{id_departamento}", response_model=DepartamentoOut)
def update_departamento(
    id_departamento: int,
    payload: DepartamentoUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> DepartamentoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_slug = (target_meta[1] if target_meta else None) or str(auth.get("tenant_slug") or "").strip().lower()
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or tenant_slug or None
    _ensure_gestao_interna_tables_for_auth(tenant_id=target_tenant_id, tenant_slug=tenant_slug)

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(DepartamentoModel, id_departamento)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento não encontrado")
        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip()
            setattr(row, k, v)
        if getattr(row, "IdTenant", None) is None and target_tenant_id > 0:
            row.IdTenant = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar departamento")
        tdb.refresh(row)
        return _departamento_as_out(row)


@app.delete("/api/departamentos/{id_departamento}", status_code=status.HTTP_204_NO_CONTENT)
def delete_departamento(
    id_departamento: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(DepartamentoModel, id_departamento)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento não encontrado")
        tdb.delete(row)
        tdb.commit()


@app.get("/api/funcoes", response_model=list[FuncaoOut])
def list_funcoes(
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[FuncaoOut]:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    auth_tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    _ensure_gestao_interna_tables_for_auth(tenant_id=auth_tenant_id, tenant_slug=auth_tenant_slug)

    if (_is_superadmin(auth) or _is_executive_tenant(auth)) and tenant_id is not None:
        with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
            rows = tdb.execute(select(FuncaoModel).order_by(FuncaoModel.IdFuncao.asc())).scalars().all()
            return [_funcao_as_out(r) for r in rows]

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
        out: list[FuncaoOut] = []
        for t in tenants:
            slug = str(t.Slug or "").strip().lower()
            _ensure_gestao_interna_tables_for_auth(tenant_id=int(t.IdTenant), tenant_slug=slug)
            if slug == "executive":
                rows = db.execute(select(FuncaoModel).order_by(FuncaoModel.IdFuncao.asc())).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=slug)
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    rows = tdb.execute(select(FuncaoModel).order_by(FuncaoModel.IdFuncao.asc())).scalars().all()
            out.extend([_funcao_as_out(r) for r in rows])
        out.sort(key=lambda r: (str(r.Tenant or ""), int(r.IdFuncao or 0)))
        return out

    rows = db.execute(select(FuncaoModel).order_by(FuncaoModel.IdFuncao.asc())).scalars().all()
    return [_funcao_as_out(r) for r in rows]


@app.get("/api/funcoes/{id_funcao}", response_model=FuncaoOut)
def get_funcao(
    id_funcao: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> FuncaoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    auth_tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    _ensure_gestao_interna_tables_for_auth(tenant_id=auth_tenant_id, tenant_slug=auth_tenant_slug)
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(FuncaoModel, id_funcao)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Função não encontrada")
        return _funcao_as_out(row)


@app.post("/api/funcoes", response_model=FuncaoOut, status_code=status.HTTP_201_CREATED)
def create_funcao(
    payload: FuncaoCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> FuncaoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_slug = (target_meta[1] if target_meta else None) or str(auth.get("tenant_slug") or "").strip().lower()
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or tenant_slug or None
    _ensure_gestao_interna_tables_for_auth(tenant_id=target_tenant_id, tenant_slug=tenant_slug)

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = FuncaoModel(
            Funcao=payload.Funcao.strip(),
            Descricao=payload.Descricao.strip() if isinstance(payload.Descricao, str) else None,
            Departamento=payload.Departamento.strip(),
            IdTenant=target_tenant_id if target_tenant_id > 0 else None,
            Tenant=tenant_name,
            DataCadastro=date.today(),
            Cadastrante=str(auth.get("nome") or auth.get("usuario") or "").strip() or None,
        )
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar função")
        tdb.refresh(row)
        return _funcao_as_out(row)


@app.put("/api/funcoes/{id_funcao}", response_model=FuncaoOut)
def update_funcao(
    id_funcao: int,
    payload: FuncaoUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> FuncaoOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_slug = (target_meta[1] if target_meta else None) or str(auth.get("tenant_slug") or "").strip().lower()
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or tenant_slug or None
    _ensure_gestao_interna_tables_for_auth(tenant_id=target_tenant_id, tenant_slug=tenant_slug)

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(FuncaoModel, id_funcao)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Função não encontrada")
        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip()
            setattr(row, k, v)
        if getattr(row, "IdTenant", None) is None and target_tenant_id > 0:
            row.IdTenant = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar função")
        tdb.refresh(row)
        return _funcao_as_out(row)


@app.delete("/api/funcoes/{id_funcao}", status_code=status.HTTP_204_NO_CONTENT)
def delete_funcao(
    id_funcao: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(FuncaoModel, id_funcao)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Função não encontrada")
        tdb.delete(row)
        tdb.commit()


@app.get("/api/colaboradores", response_model=list[ColaboradorOut])
def list_colaboradores(
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[ColaboradorOut]:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    auth_tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    _ensure_gestao_interna_tables_for_auth(tenant_id=auth_tenant_id, tenant_slug=auth_tenant_slug)

    if (_is_superadmin(auth) or _is_executive_tenant(auth)) and tenant_id is not None:
        with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
            rows = tdb.execute(select(ColaboradorModel).order_by(ColaboradorModel.IdColaborador.asc())).scalars().all()
            return [_colaborador_as_out(r) for r in rows]

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()
        out: list[ColaboradorOut] = []
        for t in tenants:
            slug = str(t.Slug or "").strip().lower()
            _ensure_gestao_interna_tables_for_auth(tenant_id=int(t.IdTenant), tenant_slug=slug)
            if slug == "executive":
                rows = db.execute(select(ColaboradorModel).order_by(ColaboradorModel.IdColaborador.asc())).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=slug)
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    rows = tdb.execute(select(ColaboradorModel).order_by(ColaboradorModel.IdColaborador.asc())).scalars().all()
            out.extend([_colaborador_as_out(r) for r in rows])
        out.sort(key=lambda r: (str(r.Tenant or ""), int(r.IdColaborador or 0)))
        return out

    rows = db.execute(select(ColaboradorModel).order_by(ColaboradorModel.IdColaborador.asc())).scalars().all()
    return [_colaborador_as_out(r) for r in rows]


@app.get("/api/colaboradores/{id_colaborador}", response_model=ColaboradorOut)
def get_colaborador(
    id_colaborador: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ColaboradorOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    auth_tenant_slug = str(auth.get("tenant_slug") or "").strip().lower()
    _ensure_gestao_interna_tables_for_auth(tenant_id=auth_tenant_id, tenant_slug=auth_tenant_slug)
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ColaboradorModel, id_colaborador)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado")
        return _colaborador_as_out(row)


@app.post("/api/colaboradores", response_model=ColaboradorOut, status_code=status.HTTP_201_CREATED)
def create_colaborador(
    payload: ColaboradorCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ColaboradorOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_slug = (target_meta[1] if target_meta else None) or str(auth.get("tenant_slug") or "").strip().lower()
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or tenant_slug or None
    _ensure_gestao_interna_tables_for_auth(tenant_id=target_tenant_id, tenant_slug=tenant_slug)

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = ColaboradorModel(
            Colaborador=payload.Colaborador.strip(),
            Descricao=payload.Descricao.strip() if isinstance(payload.Descricao, str) else None,
            Funcao=payload.Funcao.strip(),
            IdTenant=target_tenant_id if target_tenant_id > 0 else None,
            Tenant=tenant_name,
            DataCadastro=date.today(),
            Cadastrante=str(auth.get("nome") or auth.get("usuario") or "").strip() or None,
        )
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar colaborador")
        tdb.refresh(row)
        return _colaborador_as_out(row)


@app.put("/api/colaboradores/{id_colaborador}", response_model=ColaboradorOut)
def update_colaborador(
    id_colaborador: int,
    payload: ColaboradorUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ColaboradorOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_slug = (target_meta[1] if target_meta else None) or str(auth.get("tenant_slug") or "").strip().lower()
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or tenant_slug or None
    _ensure_gestao_interna_tables_for_auth(tenant_id=target_tenant_id, tenant_slug=tenant_slug)

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ColaboradorModel, id_colaborador)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado")
        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip()
            setattr(row, k, v)
        if getattr(row, "IdTenant", None) is None and target_tenant_id > 0:
            row.IdTenant = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar colaborador")
        tdb.refresh(row)
        return _colaborador_as_out(row)


@app.delete("/api/colaboradores/{id_colaborador}", status_code=status.HTTP_204_NO_CONTENT)
def delete_colaborador(
    id_colaborador: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ColaboradorModel, id_colaborador)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado")
        tdb.delete(row)
        tdb.commit()


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
        conn.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
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


def _drop_public_schema_existing_tenant_databases() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        return

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

    with SessionLocal() as db:
        tenants = db.execute(select(TenantsModel).order_by(TenantsModel.IdTenant.asc())).scalars().all()

    for t in tenants:
        if str(t.Slug or "").strip().lower() == "executive":
            continue
        db_name = _sanitize_db_name(_tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug or "")))
        with admin_engine.connect() as conn:
            exists = conn.execute(text("select 1 from pg_database where datname=:n"), {"n": db_name}).first()
            if not exists:
                continue
        tenant_engine = _tenant_engine(db_name=db_name)
        with tenant_engine.connect() as conn:
            conn.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            conn.commit()


_drop_public_schema_existing_tenant_databases()


def _drop_database(db_name: str) -> None:
    if not DATABASE_URL.startswith("postgresql"):
        raise RuntimeError("Somente PostgreSQL é suportado")

    safe_db = _sanitize_db_name(db_name)

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
        exists = conn.execute(text("select 1 from pg_database where datname=:n"), {"n": safe_db}).first()
        if not exists:
            return

        conn.execute(
            text(
                """
                select pg_terminate_backend(pid)
                from pg_stat_activity
                where datname = :n and pid <> pg_backend_pid()
                """
            ),
            {"n": safe_db},
        )
        conn.exec_driver_sql(f'ALTER DATABASE "{safe_db}" WITH ALLOW_CONNECTIONS false')
        conn.execute(
            text(
                """
                select pg_terminate_backend(pid)
                from pg_stat_activity
                where datname = :n and pid <> pg_backend_pid()
                """
            ),
            {"n": safe_db},
        )
        conn.exec_driver_sql(f'DROP DATABASE IF EXISTS "{safe_db}"')


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
        safe_db = _sanitize_db_name(db_name)
        if str(row.Slug).lower() != "executive":
            tenant_name_safe = str(row.Tenant or "").strip() or str(row.Slug or "").strip().lower()
            _ensure_executivos_tenant_columns_tenant_db(db_name=safe_db, tenant_id=int(row.IdTenant), tenant_name=tenant_name_safe)
            _ensure_table_tenant_columns_tenant_db(db_name=safe_db, table="Ativos", tenant_id=int(row.IdTenant), tenant_name=tenant_name_safe)
            _ensure_table_tenant_columns_tenant_db(db_name=safe_db, table="ContasPagar", tenant_id=int(row.IdTenant), tenant_name=tenant_name_safe)
            _ensure_table_tenant_columns_tenant_db(db_name=safe_db, table="CentroCustos", tenant_id=int(row.IdTenant), tenant_name=tenant_name_safe)
            _TENANT_DB_TENANT_COLUMNS_ENSURED.add(safe_db)
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
def delete_tenant(
    id_tenant: int,
    delete_db: bool = Query(False, alias="delete_db"),
    db: Session = Depends(get_db),
    auth: dict[str, Any] = Depends(_require_superadmin),
) -> None:
    row = db.get(TenantsModel, id_tenant)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado")
    if int(row.IdTenant) == 1 or str(row.Slug or "").strip().lower() == "executive":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é permitido excluir o tenant EXECUTIVE")

    if delete_db:
        db_name = _tenant_db_name(tenant_id=int(row.IdTenant), slug=str(row.Slug))
        try:
            _drop_database(db_name)
        except Exception as e:
            msg = str(getattr(e, "orig", None) or e or "").strip()
            msg = re.sub(r"\s+", " ", msg).strip()
            if not msg:
                msg = str(e.__class__.__name__)
            if len(msg) > 240:
                msg = msg[:240].rstrip() + "..."
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Falha ao deletar banco do tenant: {msg}")

        tenant_name = str(row.Tenant or "").strip()
        if tenant_name:
            db.execute(delete(ExecutivoModel).where(func.lower(ExecutivoModel.Empresa) == tenant_name.lower()))
            db.execute(delete(ContasPagarModel).where(func.lower(ContasPagarModel.Empresa) == tenant_name.lower()))
            db.execute(delete(AtivoModel).where(func.lower(AtivoModel.Empresa) == tenant_name.lower()))
            db.execute(delete(CentroCustosModel).where(func.lower(CentroCustosModel.Empresa) == tenant_name.lower()))

    db.execute(delete(UsuariosModel).where(UsuariosModel.TenantId == int(row.IdTenant)))
    db.delete(row)
    db.commit()


def _sanitize_segment(value: str) -> str:
    cleaned = re.sub(r"[^\w\s.-]+", "", value, flags=re.UNICODE).strip()
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or "SemEmpresa"


def _pessoa_fisica_images_base_dir() -> Path:
    repo_root = Path(__file__).resolve().parents[2]
    return repo_root / "src" / "assets" / "Images" / "PessoaFisica"


def _pessoa_fisica_tenant_dir(tenant_name: str) -> Path:
    safe = _sanitize_segment(str(tenant_name or "").strip())
    safe = safe.replace("..", ".")
    return _pessoa_fisica_images_base_dir() / safe


class PessoaFisicaImagemIn(BaseModel):
    Id: int = Field(..., ge=1)
    Tenant: str = Field(..., min_length=1)
    ImageBase64: str = Field(..., min_length=1)


@app.post("/api/pessoa-fisica/imagem")
def upload_pessoa_fisica_imagem(payload: PessoaFisicaImagemIn, auth: dict[str, Any] = Depends(_require_auth)) -> dict[str, str]:
    raw = str(payload.ImageBase64 or "").strip()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagem inválida")

    b64 = raw
    if raw.startswith("data:"):
        parts = raw.split(",", 1)
        if len(parts) != 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagem inválida")
        header = parts[0].lower()
        if "image/jpeg" not in header and "image/jpg" not in header:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A imagem deve ser JPG")
        b64 = parts[1]

    try:
        content = base64.b64decode(b64, validate=True)
    except Exception:
        try:
            content = base64.b64decode(b64)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagem inválida")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Imagem muito grande")

    tenant_dir = _pessoa_fisica_tenant_dir(payload.Tenant)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    out_path = (tenant_dir / f"{int(payload.Id)}.jpg").resolve()

    base_dir = _pessoa_fisica_images_base_dir().resolve()
    if os.path.commonpath([str(base_dir), str(out_path)]) != str(base_dir):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caminho inválido")

    out_path.write_bytes(content)
    return {"path": str(out_path)}


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
        TenantId=getattr(row, "TenantId", None),
        Tenant=getattr(row, "Tenant", None),
    )


@app.get("/api/contas-pagar", response_model=list[ContasPagarOut])
def list_contas_pagar(
    empresa: Optional[str] = None,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> list[ContasPagarOut]:
    empresa_in = empresa.strip() if isinstance(empresa, str) and empresa.strip() else None
    if _is_executive_tenant(auth) and empresa_in and empresa_in.strip().lower() == "executive":
        empresa_in = None

    if _is_superadmin(auth) or _is_executive_tenant(auth):
        stmt_tenants = select(TenantsModel)
        if empresa_in:
            stmt_tenants = stmt_tenants.where(or_(TenantsModel.Tenant == empresa_in, TenantsModel.Slug == empresa_in.lower()))
        tenants = db.execute(stmt_tenants.order_by(TenantsModel.IdTenant.asc())).scalars().all()

        out: list[ContasPagarOut] = []
        for t in tenants:
            _ensure_tenant_columns_for_auth(tenant_id=int(t.IdTenant), tenant_slug=str(t.Slug or ""))
            if str(t.Slug or "").lower() == "executive":
                stmt = (
                    select(ContasPagarModel)
                    .where(ContasPagarModel.Empresa == str(t.Tenant))
                    .order_by(ContasPagarModel.IdContasPagar.asc())
                )
                rows = db.execute(stmt).scalars().all()
            else:
                db_name = _tenant_db_name(tenant_id=int(t.IdTenant), slug=str(t.Slug))
                TenantSession = _tenant_sessionmaker(db_name)
                with TenantSession() as tdb:
                    stmt = select(ContasPagarModel).order_by(ContasPagarModel.IdContasPagar.asc())
                    rows = tdb.execute(stmt).scalars().all()
            out.extend([_as_out(r) for r in rows])

        out.sort(key=lambda r: (str(r.Empresa or ""), int(r.IdContasPagar or 0)))
        return out

    stmt = select(ContasPagarModel).order_by(ContasPagarModel.IdContasPagar.asc())
    rows = db.execute(stmt).scalars().all()
    return [_as_out(r) for r in rows]


@app.get("/api/contas-pagar/{id_contas_pagar}", response_model=ContasPagarOut)
def get_contas_pagar(
    id_contas_pagar: int,
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ContasPagarOut:
    row = db.get(ContasPagarModel, id_contas_pagar)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
    return _as_out(row)


@app.post("/api/contas-pagar", response_model=ContasPagarOut, status_code=status.HTTP_201_CREATED)
def create_contas_pagar(
    payload: ContasPagarCreate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ContasPagarOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        data = payload.model_dump()
        data["TenantId"] = target_tenant_id if target_tenant_id > 0 else None
        data["Tenant"] = tenant_name
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
            exec_row = tdb.get(ExecutivoModel, int(devedor_id))
            if exec_row:
                data["Devedor"] = exec_row.Executivo

        row = ContasPagarModel(**data)
        tdb.add(row)
        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao criar conta a pagar")
        tdb.refresh(row)
        return _as_out(row)


@app.put("/api/contas-pagar/{id_contas_pagar}", response_model=ContasPagarOut)
def update_contas_pagar(
    id_contas_pagar: int,
    payload: ContasPagarUpdate,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ContasPagarOut:
    auth_tenant_id = int(auth.get("tenant_id") or 0)
    target_tenant_id = int(tenant_id) if (tenant_id is not None and (_is_superadmin(auth) or _is_executive_tenant(auth))) else auth_tenant_id
    target_meta = _tenant_meta_from_id(target_tenant_id) if target_tenant_id > 0 else None
    tenant_name = (target_meta[2] if target_meta else None) or _tenant_name_from_id(auth_tenant_id) or str(auth.get("tenant_slug") or "").strip() or None

    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ContasPagarModel, id_contas_pagar)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")

        data: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            if isinstance(v, str):
                v = v.strip()
            setattr(row, k, v)

        if target_tenant_id > 0 and (getattr(row, "TenantId", None) is None or int(getattr(row, "TenantId") or 0) == 0):
            row.TenantId = target_tenant_id
        if not getattr(row, "Tenant", None):
            row.Tenant = tenant_name

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
            exec_row = tdb.get(ExecutivoModel, int(row.DevedorIdExecutivo))
            if exec_row:
                row.Devedor = exec_row.Executivo

        try:
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao atualizar conta a pagar")
        tdb.refresh(row)
        return _as_out(row)


@app.delete("/api/contas-pagar/{id_contas_pagar}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contas_pagar(
    id_contas_pagar: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> None:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ContasPagarModel, id_contas_pagar)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta a pagar não encontrada")
        tdb.delete(row)
        tdb.commit()


@app.post("/api/contas-pagar/{id_contas_pagar}/documento", response_model=ContasPagarOut)
async def upload_documento(
    id_contas_pagar: int,
    file: UploadFile = File(...),
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ContasPagarOut:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ContasPagarModel, id_contas_pagar)
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
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao salvar documento")
        tdb.refresh(row)
        return _as_out(row)


@app.post("/api/contas-pagar/{id_contas_pagar}/documento/baixar-url", response_model=ContasPagarOut)
def baixar_documento_url(
    id_contas_pagar: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
) -> ContasPagarOut:
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ContasPagarModel, id_contas_pagar)
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
            tdb.commit()
        except IntegrityError:
            tdb.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao salvar documento")
        tdb.refresh(row)
        return _as_out(row)


@app.get("/api/contas-pagar/{id_contas_pagar}/documento")
def download_documento(
    id_contas_pagar: int,
    tenant_id: Optional[int] = Query(None, alias="tenant_id"),
    db: Session = Depends(get_tenant_db),
    auth: dict[str, Any] = Depends(_require_auth),
):
    with _target_tenant_session(db=db, auth=auth, tenant_id=tenant_id) as tdb:
        row = tdb.get(ContasPagarModel, id_contas_pagar)
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
