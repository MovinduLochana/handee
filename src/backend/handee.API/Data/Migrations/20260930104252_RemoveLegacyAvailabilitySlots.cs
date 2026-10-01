using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace handee.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyAvailabilitySlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderAvailabilitySlots");

            migrationBuilder.DropIndex(
                name: "IX_ProviderOperatingSchedules_ProviderId",
                table: "ProviderOperatingSchedules");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderOperatingSchedules_ProviderId_DayOfWeek",
                table: "ProviderOperatingSchedules",
                columns: new[] { "ProviderId", "DayOfWeek" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProviderOperatingSchedules_ProviderId_DayOfWeek",
                table: "ProviderOperatingSchedules");

            migrationBuilder.CreateTable(
                name: "ProviderAvailabilitySlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsBooked = table.Column<bool>(type: "boolean", nullable: false),
                    StartTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAvailabilitySlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderAvailabilitySlots_AspNetUsers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderOperatingSchedules_ProviderId",
                table: "ProviderOperatingSchedules",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilitySlots_ProviderId_StartTime",
                table: "ProviderAvailabilitySlots",
                columns: new[] { "ProviderId", "StartTime" });
        }
    }
}
