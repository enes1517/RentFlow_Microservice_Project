FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/SagaOrchestrator/SagaOrchestrator.API/SagaOrchestrator.API.csproj"
WORKDIR "/src/src/SagaOrchestrator/SagaOrchestrator.API"
RUN dotnet build "SagaOrchestrator.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SagaOrchestrator.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 80
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SagaOrchestrator.API.dll"]
