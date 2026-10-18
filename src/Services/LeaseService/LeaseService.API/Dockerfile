FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/Services/LeaseService/LeaseService.API/LeaseService.API.csproj"
WORKDIR "/src/src/Services/LeaseService/LeaseService.API"
RUN dotnet build "LeaseService.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "LeaseService.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 80
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "LeaseService.API.dll"]
