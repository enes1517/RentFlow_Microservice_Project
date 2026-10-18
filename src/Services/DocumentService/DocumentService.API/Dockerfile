FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/Services/DocumentService/DocumentService.API/DocumentService.API.csproj"
WORKDIR "/src/src/Services/DocumentService/DocumentService.API"
RUN dotnet build "DocumentService.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "DocumentService.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 80
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DocumentService.API.dll"]
