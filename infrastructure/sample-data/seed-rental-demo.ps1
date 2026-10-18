$ErrorActionPreference = 'Stop'

$profileQuery = @'
SELECT "Role" || '|' || "Id"::text
FROM "UserProfiles"
WHERE "Email" IN ('landlord@demo.com', 'tenant@demo.com')
  AND "IsActive" = TRUE;
'@
$profileRows = $profileQuery | docker exec -i rent-postgres psql -X -q -A -t -v ON_ERROR_STOP=1 -U rentadmin -d user_service_db
if ($LASTEXITCODE -ne 0) {
    throw 'Could not read the demo landlord and tenant profiles from UserService.'
}

$profiles = @{}
foreach ($row in $profileRows) {
    $parts = $row.Trim() -split '\|'
    if ($parts.Length -eq 2) {
        $profiles[$parts[0]] = $parts[1]
    }
}
if (-not $profiles.ContainsKey('LANDLORD') -or -not $profiles.ContainsKey('TENANT')) {
    throw 'The active landlord@demo.com and tenant@demo.com profiles must exist before seeding sample data.'
}

$landlordId = $profiles['LANDLORD']
$tenantId = $profiles['TENANT']
$propertyId = '10000000-0000-0000-0000-000000000001'
$secondPropertyId = '10000000-0000-0000-0000-000000000002'
$firstUnitId = '20000000-0000-0000-0000-000000000001'
$secondUnitId = '20000000-0000-0000-0000-000000000002'
$thirdUnitId = '20000000-0000-0000-0000-000000000003'
$leaseId = '30000000-0000-0000-0000-000000000001'
$documentId = '60000000-0000-0000-0000-000000000001'
$notificationId = '80000000-0000-0000-0000-000000000001'
$documentKey = "lease-contracts/$leaseId/sample-lease-contract.pdf"

$pdfContent = 'BT /F1 14 Tf 72 720 Td (RentFlow demo lease agreement - sample data only) Tj ET'
$pdfObjects = @(
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    "<< /Length $([Text.Encoding]::ASCII.GetByteCount($pdfContent)) >>`nstream`n$pdfContent`nendstream"
)
$samplePdf = "%PDF-1.4`n"
$pdfOffsets = @()
for ($index = 0; $index -lt $pdfObjects.Count; $index++) {
    $pdfOffsets += [Text.Encoding]::ASCII.GetByteCount($samplePdf)
    $samplePdf += "$($index + 1) 0 obj`n$($pdfObjects[$index])`nendobj`n"
}
$xrefOffset = [Text.Encoding]::ASCII.GetByteCount($samplePdf)
$samplePdf += "xref`n0 6`n0000000000 65535 f `n"
foreach ($offset in $pdfOffsets) {
    $samplePdf += ('{0:D10} 00000 n ' -f $offset) + "`n"
}
$samplePdf += "trailer`n<< /Size 6 /Root 1 0 R >>`nstartxref`n$xrefOffset`n%%EOF`n"
$mcCommand = 'mc alias set myminio http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc pipe myminio/documents/{0}' -f $documentKey
[Console]::OutputEncoding = [Text.Encoding]::ASCII
$samplePdf | docker compose run --rm --no-deps -T --entrypoint /bin/sh minio-init -c $mcCommand
if ($LASTEXITCODE -ne 0) {
    throw 'Could not store the sample lease PDF in MinIO.'
}
$statCommand = 'mc alias set myminio http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc stat myminio/documents/{0} --json' -f $documentKey
$statOutput = docker compose run --rm --no-deps -T --entrypoint /bin/sh minio-init -c $statCommand
if ($LASTEXITCODE -ne 0) {
    throw 'Could not verify the sample lease PDF in MinIO.'
}
$statJson = $statOutput | Where-Object { "$_" -match '^\{' } | Select-Object -Last 1
if (-not $statJson) {
    throw 'MinIO did not return object metadata for the sample lease PDF.'
}
$samplePdfSize = [long](ConvertFrom-Json -InputObject $statJson).size

$sql = @"
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM lease_service_db.dbo.LeaseAgreements WHERE Id = '$leaseId')
BEGIN
    INSERT INTO lease_service_db.dbo.LeaseAgreements
        (Id, TenantId, LandlordId, PropertyId, UnitId, StartDate, EndDate,
         MonthlyRentAmount, DepositAmount, Status, CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('$leaseId', '$tenantId', '$landlordId', '$propertyId', '$firstUnitId',
         '2026-01-01T00:00:00', '2027-01-01T00:00:00',
         24000.00, 24000.00, 'ACTIVE', '2026-01-01T00:00:00', '2026-01-01T00:00:00', 'SAMPLE_DATA');
END;

IF NOT EXISTS (SELECT 1 FROM payment_service_db.dbo.PaymentTransactions WHERE Id = '40000000-0000-0000-0000-000000000001')
    INSERT INTO payment_service_db.dbo.PaymentTransactions
        (Id, LeaseId, TenantId, Amount, Currency, PaymentType, Status, FailureReason, CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('40000000-0000-0000-0000-000000000001', '$leaseId', '$tenantId', 24000.00, 'TRY', 'RENT', 'SUCCESS', NULL, '2026-07-01T12:00:00', '2026-07-01T12:00:00', 'SAMPLE_DATA');

IF NOT EXISTS (SELECT 1 FROM payment_service_db.dbo.PaymentTransactions WHERE Id = '40000000-0000-0000-0000-000000000002')
    INSERT INTO payment_service_db.dbo.PaymentTransactions
        (Id, LeaseId, TenantId, Amount, Currency, PaymentType, Status, FailureReason, CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('40000000-0000-0000-0000-000000000002', '$leaseId', '$tenantId', 24000.00, 'TRY', 'RENT', 'SUCCESS', NULL, '2026-08-01T12:00:00', '2026-08-01T12:00:00', 'SAMPLE_DATA');

IF NOT EXISTS (SELECT 1 FROM MaintenanceDb.dbo.MaintenanceRequests WHERE Id = '50000000-0000-0000-0000-000000000001')
    INSERT INTO MaintenanceDb.dbo.MaintenanceRequests
        (Id, TenantId, PropertyId, UnitId, Title, Description, Priority, Status, EstimatedCost, CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('50000000-0000-0000-0000-000000000001', '$tenantId', '$propertyId', '$firstUnitId',
         'Mutfak bataryasi degisimi', 'Kullanim omrunu tamamlayan mutfak bataryasinin degistirilmesi.',
         'MEDIUM', 'CLOSED', 3200.00, '2026-08-10T09:00:00', '2026-08-15T15:00:00', 'SAMPLE_DATA');

IF NOT EXISTS (SELECT 1 FROM MaintenanceDb.dbo.MaintenanceRequests WHERE Id = '50000000-0000-0000-0000-000000000002')
    INSERT INTO MaintenanceDb.dbo.MaintenanceRequests
        (Id, TenantId, PropertyId, UnitId, Title, Description, Priority, Status, EstimatedCost, CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('50000000-0000-0000-0000-000000000002', '$tenantId', '$propertyId', '$firstUnitId',
         'Banyo havalandirmasi kontrolu', 'Banyo havalandirmasindan ses geliyor; kontrol edilmesi gerekiyor.',
         'LOW', 'OPEN', NULL, '2026-10-03T10:00:00', NULL, 'SAMPLE_DATA');

IF NOT EXISTS (SELECT 1 FROM DocumentDb.dbo.Documents WHERE Id = '$documentId')
    INSERT INTO DocumentDb.dbo.Documents
        (Id, OwnerId, RelatedEntityId, FileName, FilePath, ContentType, FileSizeBytes,
         DocumentType, CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('$documentId', '$tenantId', '$leaseId', 'Ornek-Kira-Sozlesmesi.pdf',
         '$documentKey', 'application/pdf', $samplePdfSize,
         'LEASE_CONTRACT', '2026-01-01T00:00:00', NULL, 'SAMPLE_DATA');
ELSE
    UPDATE DocumentDb.dbo.Documents
    SET FileSizeBytes = $samplePdfSize
    WHERE Id = '$documentId';

IF NOT EXISTS (SELECT 1 FROM ReportDb.dbo.MonthlyIncomeReports
               WHERE LandlordId = '$landlordId' AND [Year] = 2026 AND [Month] = 7)
    INSERT INTO ReportDb.dbo.MonthlyIncomeReports
        (Id, LandlordId, [Year], [Month], TotalIncome, TotalLateFees, TotalMaintenanceCosts,
         CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('70000000-0000-0000-0000-000000000001', '$landlordId', 2026, 7,
         24000.00, 0.00, 0.00, '2026-08-01T00:00:00', NULL, 'SAMPLE_DATA');

IF NOT EXISTS (SELECT 1 FROM ReportDb.dbo.MonthlyIncomeReports
               WHERE LandlordId = '$landlordId' AND [Year] = 2026 AND [Month] = 8)
    INSERT INTO ReportDb.dbo.MonthlyIncomeReports
        (Id, LandlordId, [Year], [Month], TotalIncome, TotalLateFees, TotalMaintenanceCosts,
         CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('70000000-0000-0000-0000-000000000002', '$landlordId', 2026, 8,
         24000.00, 0.00, 3200.00, '2026-09-01T00:00:00', NULL, 'SAMPLE_DATA');

IF NOT EXISTS (SELECT 1 FROM NotificationDb.dbo.NotificationLogs WHERE Id = '$notificationId')
    INSERT INTO NotificationDb.dbo.NotificationLogs
        (Id, UserId, Type, Subject, Content, Status, ErrorMessage,
         CreatedAt, UpdatedAt, CreatedBy)
    VALUES
        ('$notificationId', '$tenantId', 'EMAIL', 'RentFlow ornek kira bildirimi',
         'Bu ileti yalnizca gelistirme ortami ornek verisidir. Kira odemeniz icin gercek bir islem yapilmaz.',
         'PENDING', NULL, SYSUTCDATETIME(), NULL, 'SAMPLE_DATA');

COMMIT TRANSACTION;
"@
$sql | docker exec -i rent-sqlserver bash -lc '/opt/mssql-tools18/bin/sqlcmd -b -C -S localhost -U SA -P "$SA_PASSWORD" -i /dev/stdin -h -1 -W'
if ($LASTEXITCODE -ne 0) {
    throw 'Could not add the sample lease, payment, and maintenance records to SQL Server.'
}

$notificationStatusQuery = "SELECT Status FROM NotificationDb.dbo.NotificationLogs WHERE Id = '$notificationId';"
$notificationStatus = $notificationStatusQuery | docker exec -i rent-sqlserver bash -lc '/opt/mssql-tools18/bin/sqlcmd -b -C -S localhost -U SA -P "$SA_PASSWORD" -i /dev/stdin -h -1 -W'
if ($LASTEXITCODE -ne 0) {
    throw 'Could not read the sample notification status.'
}
if ($notificationStatus.Trim() -eq 'PENDING') {
    $message = [System.Net.Mail.MailMessage]::new()
    $message.From = [System.Net.Mail.MailAddress]::new('noreply@rentflow.local', 'RentFlow')
    $message.To.Add('tenant@demo.com')
    $message.Subject = 'RentFlow ornek kira bildirimi'
    $message.Body = 'Bu ileti yalnizca gelistirme ortami ornek verisidir. Kira odemeniz icin gercek bir islem yapilmaz.'
    $smtp = [System.Net.Mail.SmtpClient]::new('localhost', 1025)
    try {
        $smtp.Send($message)
        $markSentSql = "UPDATE NotificationDb.dbo.NotificationLogs SET Status = 'SENT', UpdatedAt = SYSUTCDATETIME() WHERE Id = '$notificationId' AND Status = 'PENDING';"
        $markSentSql | docker exec -i rent-sqlserver bash -lc '/opt/mssql-tools18/bin/sqlcmd -b -C -S localhost -U SA -P "$SA_PASSWORD" -i /dev/stdin'
        if ($LASTEXITCODE -ne 0) {
            throw 'Email was accepted by local MailHog, but the notification status could not be updated.'
        }
    }
    catch [System.Net.Mail.SmtpException] {
        $escapedError = $_.Exception.Message.Replace("'", "''")
        $markFailedSql = "UPDATE NotificationDb.dbo.NotificationLogs SET Status = 'FAILED', ErrorMessage = '$escapedError', UpdatedAt = SYSUTCDATETIME() WHERE Id = '$notificationId' AND Status = 'PENDING';"
        $markFailedSql | docker exec -i rent-sqlserver bash -lc '/opt/mssql-tools18/bin/sqlcmd -b -C -S localhost -U SA -P "$SA_PASSWORD" -i /dev/stdin'
        throw "MailHog could not accept the sample notification: $($_.Exception.Message)"
    }
    finally {
        $smtp.Dispose()
        $message.Dispose()
    }
}

$mongoScript = @"
const properties = db.getSiblingDB("PropertyDb").Properties;
properties.updateOne(
  { _id: UUID("$propertyId") },
  { `$setOnInsert: {
      Name: "Ornek Residence Kadikoy",
      Description: "Gelir raporu ve kiraci akislari icin ornek konut.",
      LandlordId: UUID("$landlordId"),
      Address: { Street: "Moda Caddesi 10", City: "Istanbul", State: "Kadikoy", ZipCode: "34710", Country: "Turkiye" },
      Units: [
        { Id: UUID("$firstUnitId"), UnitNumber: "5A", Floor: 5, SquareMeters: NumberDecimal("95"), RentAmount: NumberDecimal("24000"), Currency: "TRY", Status: "RENTED", ReservedForLeaseId: UUID("$leaseId") },
        { Id: UUID("$secondUnitId"), UnitNumber: "5B", Floor: 5, SquareMeters: NumberDecimal("72"), RentAmount: NumberDecimal("18500"), Currency: "TRY", Status: "AVAILABLE", ReservedForLeaseId: null }
      ],
      CreatedAt: ISODate("2026-01-01T00:00:00Z"),
      UpdatedAt: ISODate("2026-01-01T00:00:00Z")
  } },
  { upsert: true }
);
properties.updateOne(
  { _id: UUID("$secondPropertyId") },
  { `$setOnInsert: {
      Name: "Ornek Cankaya Daireleri",
      Description: "Ev sahibi panelinde listelenecek ikinci ornek mulk.",
      LandlordId: UUID("$landlordId"),
      Address: { Street: "Ataturk Bulvari 25", City: "Ankara", State: "Cankaya", ZipCode: "06680", Country: "Turkiye" },
      Units: [
        { Id: UUID("$thirdUnitId"), UnitNumber: "12", Floor: 3, SquareMeters: NumberDecimal("88"), RentAmount: NumberDecimal("22000"), Currency: "TRY", Status: "AVAILABLE", ReservedForLeaseId: null }
      ],
      CreatedAt: ISODate("2026-01-02T00:00:00Z"),
      UpdatedAt: ISODate("2026-01-02T00:00:00Z")
  } },
  { upsert: true }
);
print("Sample properties ready: " + properties.countDocuments({ _id: { `$in: [UUID("$propertyId"), UUID("$secondPropertyId")] } }));
"@
$mongoScript | docker exec -i rent-mongodb sh -lc 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin'
if ($LASTEXITCODE -ne 0) {
    throw 'Could not add sample properties to MongoDB.'
}

Write-Output 'Sample rental data is ready. Demo payments are illustrative development data, not real collections.'
