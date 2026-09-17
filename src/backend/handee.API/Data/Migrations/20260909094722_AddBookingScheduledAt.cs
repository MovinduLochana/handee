using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace handee.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingScheduledAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ScheduledAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScheduledAt",
                table: "Bookings");
        }
    }
}
