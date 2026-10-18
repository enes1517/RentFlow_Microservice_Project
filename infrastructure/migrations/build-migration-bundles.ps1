param(
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "artifacts\migrations"),
    [string]$Runtime = "linux-x64"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$migrationTargets = @(
    @{
        Name = "UserService"
        Project = "src\Services\UserService\UserService.Infrastructure\UserService.Infrastructure.csproj"
        StartupProject = "src\Services\UserService\UserService.API\UserService.API.csproj"
        Context = "UserDbContext"
        DesignTimeConnectionString = "Host=localhost;Database=RentFlow_UserService;Username=migration;Password=migration"
    },
    @{
        Name = "LeaseService"
        Project = "src\Services\LeaseService\LeaseService.Infrastructure\LeaseService.Infrastructure.csproj"
        StartupProject = "src\Services\LeaseService\LeaseService.API\LeaseService.API.csproj"
        Context = "LeaseDbContext"
        DesignTimeConnectionString = "Server=localhost;Database=RentFlow_LeaseService;User Id=migration;Password=migration;TrustServerCertificate=True"
    },
    @{
        Name = "PaymentService"
        Project = "src\Services\PaymentService\PaymentService.Infrastructure\PaymentService.Infrastructure.csproj"
        StartupProject = "src\Services\PaymentService\PaymentService.API\PaymentService.API.csproj"
        Context = "PaymentDbContext"
        DesignTimeConnectionString = "Server=localhost;Database=RentFlow_PaymentService;User Id=migration;Password=migration;TrustServerCertificate=True"
    },
    @{
        Name = "MaintenanceService"
        Project = "src\Services\MaintenanceService\MaintenanceService.Infrastructure\MaintenanceService.Infrastructure.csproj"
        StartupProject = "src\Services\MaintenanceService\MaintenanceService.API\MaintenanceService.API.csproj"
        Context = "MaintenanceDbContext"
        DesignTimeConnectionString = "Server=localhost;Database=RentFlow_MaintenanceService;User Id=migration;Password=migration;TrustServerCertificate=True"
    },
    @{
        Name = "DocumentService"
        Project = "src\Services\DocumentService\DocumentService.Infrastructure\DocumentService.Infrastructure.csproj"
        StartupProject = "src\Services\DocumentService\DocumentService.API\DocumentService.API.csproj"
        Context = "DocumentDbContext"
        DesignTimeConnectionString = "Server=localhost;Database=RentFlow_DocumentService;User Id=migration;Password=migration;TrustServerCertificate=True"
    },
    @{
        Name = "NotificationService"
        Project = "src\Services\NotificationService\NotificationService.Infrastructure\NotificationService.Infrastructure.csproj"
        StartupProject = "src\Services\NotificationService\NotificationService.API\NotificationService.API.csproj"
        Context = "NotificationDbContext"
        DesignTimeConnectionString = "Server=localhost;Database=RentFlow_NotificationService;User Id=migration;Password=migration;TrustServerCertificate=True"
    },
    @{
        Name = "ReportService"
        Project = "src\Services\ReportService\ReportService.Infrastructure\ReportService.Infrastructure.csproj"
        StartupProject = "src\Services\ReportService\ReportService.API\ReportService.API.csproj"
        Context = "ReportDbContext"
        DesignTimeConnectionString = "Server=localhost;Database=RentFlow_ReportService;User Id=migration;Password=migration;TrustServerCertificate=True"
    },
    @{
        Name = "SagaOrchestrator"
        Project = "src\SagaOrchestrator\SagaOrchestrator.API\SagaOrchestrator.API.csproj"
        StartupProject = "src\SagaOrchestrator\SagaOrchestrator.API\SagaOrchestrator.API.csproj"
        Context = "SagaDbContext"
        DesignTimeConnectionString = "Host=localhost;Database=RentFlow_SagaOrchestrator;Username=migration;Password=migration"
    }
)

Push-Location $repoRoot
$environmentNames = @(
    "Authentication__Authority",
    "Authentication__MetadataAddress",
    "Authentication__Audience",
    "Authentication__RequireHttpsMetadata",
    "RabbitMQ__Username",
    "RabbitMQ__Password",
    "ConnectionStrings__DefaultConnection",
    "ConnectionStrings__RedisConnection"
)
$previousEnvironment = @{}
foreach ($name in $environmentNames) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
    & dotnet tool restore
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to restore the pinned EF Core CLI tool (exit code $LASTEXITCODE)."
    }

    $env:Authentication__Authority = "http://localhost/realms/rent-management"
    $env:Authentication__MetadataAddress = "http://localhost/realms/rent-management/.well-known/openid-configuration"
    $env:Authentication__Audience = "rent-management-api"
    $env:Authentication__RequireHttpsMetadata = "false"
    $env:RabbitMQ__Username = "migration-build"
    $env:RabbitMQ__Password = "migration-build"
    $env:ConnectionStrings__RedisConnection = "localhost:6379"

    foreach ($target in $migrationTargets) {
        $env:ConnectionStrings__DefaultConnection = $target.DesignTimeConnectionString
        $extension = if ($Runtime.StartsWith("win-", [StringComparison]::OrdinalIgnoreCase)) { ".exe" } else { "" }
        $bundlePath = Join-Path $outputPath "$($target.Name).MigrationBundle$extension"
        Write-Host "Building migration bundle: $($target.Name)"
        & dotnet ef migrations bundle `
            --project $target.Project `
            --startup-project $target.StartupProject `
            --context $target.Context `
            --configuration Release `
            --target-runtime $Runtime `
            --output $bundlePath `
            --force

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to build $($target.Name) migration bundle (exit code $LASTEXITCODE)."
        }
    }
}
finally {
    foreach ($name in $environmentNames) {
        if ($null -eq $previousEnvironment[$name]) {
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
        }
        else {
            [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], "Process")
        }
    }
    Pop-Location
}

Write-Host "Migration bundles written to $outputPath"
