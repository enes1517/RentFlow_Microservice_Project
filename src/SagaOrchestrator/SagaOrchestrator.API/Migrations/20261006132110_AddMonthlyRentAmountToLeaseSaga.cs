using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SagaOrchestrator.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyRentAmountToLeaseSaga : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyRentAmount",
                table: "LeaseAgreementSagaState",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MonthlyRentAmount",
                table: "LeaseAgreementSagaState");
        }
    }
}
