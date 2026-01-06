import os
import re
import json
import urllib.parse
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Column, Date, Integer, Numeric, String, create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def _database_url() -> str:
    return os.getenv("DATABASE_URL") or "sqlite:///./executive.db"


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite:")

def _connect_args(url: str) -> dict[str, Any]:
    if _is_sqlite(url):
        return {"check_same_thread": False}
    if url.startswith("postgresql"):
        schema = os.getenv("DB_SCHEMA") or "EXECUTIVE"
        return {"options": f'-csearch_path="{schema}"'}
    return {}


DATABASE_URL = _database_url()
engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args(DATABASE_URL),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
SCHEMA_NAME = os.getenv("DB_SCHEMA") or "EXECUTIVE"
SCHEMA_TABLE_ARGS = {} if _is_sqlite(DATABASE_URL) else {"schema": SCHEMA_NAME}


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


Base.metadata.create_all(bind=engine)

def _ensure_ativos_empresa_column() -> None:
    try:
        with engine.connect() as conn:
            if _is_sqlite(DATABASE_URL):
                rows = conn.exec_driver_sql("PRAGMA table_info('Ativos')").fetchall()
                cols = {str(r[1]) for r in rows}
                if "Empresa" not in cols:
                    conn.exec_driver_sql('ALTER TABLE "Ativos" ADD COLUMN "Empresa" VARCHAR(255)')
                conn.commit()
                return

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


_ensure_ativos_empresa_column()


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


app = FastAPI(title="Executive API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/executivos", response_model=list[ExecutivoOut])
def list_executivos(empresa: Optional[str] = None, db: Session = Depends(get_db)) -> list[ExecutivoOut]:
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
def list_ativos(empresa: Optional[str] = None, db: Session = Depends(get_db)) -> list[AtivoOut]:
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
def list_centro_custos(empresa: Optional[str] = None, db: Session = Depends(get_db)) -> list[CentroCustosOut]:
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
