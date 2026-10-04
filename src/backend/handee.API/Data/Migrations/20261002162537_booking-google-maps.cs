using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace handee.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class bookinggooglemaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Bookings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Bookings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceLocation",
                table: "Bookings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ServiceLocation",
                table: "Bookings");
        }
    }
}
