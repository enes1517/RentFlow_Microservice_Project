FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/Services/ReportService/ReportService.API/ReportService.API.csproj"
WORKDIR "/src/src/Services/ReportService/ReportService.API"
RUN dotnet build "ReportService.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ReportService.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 80
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ReportService.API.dll"]
