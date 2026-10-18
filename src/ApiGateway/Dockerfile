FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/ApiGateway/ApiGateway.csproj", "src/ApiGateway/"]
COPY ["src/SharedKernel/SharedKernel.csproj", "src/SharedKernel/"]
COPY ["src/SharedKernel.Primitives/SharedKernel.Primitives.csproj", "src/SharedKernel.Primitives/"]
RUN dotnet restore "src/ApiGateway/ApiGateway.csproj"
COPY . .
RUN dotnet publish "src/ApiGateway/ApiGateway.csproj" -c Release --no-restore -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ApiGateway.dll"]
