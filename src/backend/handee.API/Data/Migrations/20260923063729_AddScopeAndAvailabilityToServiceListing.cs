using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Handee.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScopeAndAvailabilityToServiceListing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Availability",
                table: "ServiceListings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "ServiceListings",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Availability",
                table: "ServiceListings");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "ServiceListings");
        }
    }
}
