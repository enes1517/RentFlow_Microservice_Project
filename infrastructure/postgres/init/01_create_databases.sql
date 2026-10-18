-- PostgreSQL Init Script
-- Tüm servis veritabanlarını oluşturur

-- Keycloak DB
CREATE DATABASE keycloak_db;

-- User Service DB
CREATE DATABASE user_service_db;

-- Report Service DB
CREATE DATABASE report_service_db;

-- Saga Orchestrator DB
CREATE DATABASE saga_db;

-- Hangfire DB (Payment + Notification job'ları için)
CREATE DATABASE hangfire_db;

-- İzinler ver
GRANT ALL PRIVILEGES ON DATABASE user_service_db TO rentadmin;
GRANT ALL PRIVILEGES ON DATABASE report_service_db TO rentadmin;
GRANT ALL PRIVILEGES ON DATABASE saga_db TO rentadmin;
GRANT ALL PRIVILEGES ON DATABASE hangfire_db TO rentadmin;
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO rentadmin;
