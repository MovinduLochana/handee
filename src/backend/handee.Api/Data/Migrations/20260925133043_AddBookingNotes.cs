using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Handee.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovalStatusEnum",
                table: "AgentWorkflows",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ValidationTierEnum",
                table: "AgentWorkflows",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ApprovalStatusEnum",
                table: "AgentWorkflows");

            migrationBuilder.DropColumn(
                name: "ValidationTierEnum",
                table: "AgentWorkflows");
        }
    }
}
