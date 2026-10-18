-- SQL Server Init Script
-- Lease Service ve Payment Service DB'lerini oluşturur
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'lease_service_db')
BEGIN
    CREATE DATABASE lease_service_db;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'payment_service_db')
BEGIN
    CREATE DATABASE payment_service_db;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'MaintenanceDb')
BEGIN
    CREATE DATABASE MaintenanceDb;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'DocumentDb')
BEGIN
    CREATE DATABASE DocumentDb;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'NotificationDb')
BEGIN
    CREATE DATABASE NotificationDb;
END
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ReportDb')
BEGIN
    CREATE DATABASE ReportDb;
END
GO

PRINT 'SQL Server databases created successfully.';
