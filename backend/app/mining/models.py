from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
from geoalchemy2 import Geometry


class MiningReport(Base):
    __tablename__ = 'mining_reports'
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)
    filename = Column(String, nullable=False)
    status = Column(String, default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    result = Column(JSON, nullable=True)


class Detection(Base):
    __tablename__ = 'detections'
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey('mining_reports.id'))
    # Geometry polygon of detected area (SRID 4326)
    geom = Column(Geometry(geometry_type='POLYGON', srid=4326))
    geojson = Column(JSON)
    illegal = Column(String)
    # Metrics
    area_sqm = Column(Float)
    confidence = Column(Float)
    model = Column(String)
    depth_m = Column(String)
    volume_m3 = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship('MiningReport', backref='detections')


# Spatial and related tables

class Boundary(Base):
    __tablename__ = 'boundaries'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    source = Column(String)  # shapefile/kml
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326))
    uploaded_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class IllegalReport(Base):
    __tablename__ = 'illegal_reports'
    id = Column(Integer, primary_key=True)
    boundary_id = Column(Integer, ForeignKey('boundaries.id'))
    detection_id = Column(Integer, ForeignKey('detections.id'))
    area_sqm = Column(Float)
    perimeter_m = Column(Float)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    imagery_ref = Column(String)  # link to imagery_data row or file path


class ImageryData(Base):
    __tablename__ = 'imagery_data'
    id = Column(Integer, primary_key=True)
    type = Column(String)  # EO/SAR
    resolution = Column(String)
    acquired_at = Column(DateTime(timezone=True))
    file_path = Column(String)


class VolumeEstimation(Base):
    __tablename__ = 'volume_estimations'
    id = Column(Integer, primary_key=True)
    detection_id = Column(Integer, ForeignKey('detections.id'))
    depth_m = Column(Float)
    volume_m3 = Column(Float)
    accuracy = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VisualLayer(Base):
    __tablename__ = 'visual_layers'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    layer_type = Column(String)  # geojson, mesh3d, heightmap
    data = Column(JSON)  # store geojson or metadata to fetch from file store
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True)
    severity = Column(String)
    message = Column(String)
    coords = Column(Geometry(geometry_type='POINT', srid=4326))
    acknowledged = Column(String, default='no')
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class IoTSensor(Base):
    __tablename__ = 'iot_sensors'
    id = Column(Integer, primary_key=True)
    site_id = Column(String)
    sensor_type = Column(String)  # vibration, dust, air, noise
    value = Column(Float)
    unit = Column(String)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


class BlockchainLog(Base):
    __tablename__ = 'blockchain_logs'
    id = Column(Integer, primary_key=True)
    tx_hash = Column(String, index=True)
    block_id = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    link = Column(String)


class ModelRegistry(Base):
    __tablename__ = 'model_registry'
    id = Column(Integer, primary_key=True)
    model_name = Column(String)
    version = Column(String)
    accuracy = Column(Float)
    model_type = Column(String)  # detection/prediction/llm
    deployed_at = Column(DateTime(timezone=True), server_default=func.now())


class Analytics(Base):
    __tablename__ = 'analytics'
    id = Column(Integer, primary_key=True)
    metric = Column(String)
    value = Column(Float)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True)
    detection_id = Column(Integer, ForeignKey('detections.id'))
    boundary_id = Column(Integer, ForeignKey('boundaries.id'))
    kind = Column(String)  # pdf/xlsx/geotiff
    file_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    __tablename__ = 'feedback'
    id = Column(Integer, primary_key=True)
    user_email = Column(String)
    message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemLog(Base):
    __tablename__ = 'system_logs'
    id = Column(Integer, primary_key=True)
    level = Column(String)
    message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
