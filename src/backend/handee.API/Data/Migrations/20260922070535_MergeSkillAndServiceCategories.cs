using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Handee.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MergeSkillAndServiceCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderSkillCategories");

            migrationBuilder.DropTable(
                name: "SkillCategories");

            migrationBuilder.AddColumn<string>(
                name: "IconUrl",
                table: "ServiceCategories",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProviderServiceCategories",
                columns: table => new
                {
                    ProviderProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceCategoriesId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderServiceCategories", x => new { x.ProviderProfileId, x.ServiceCategoriesId });
                    table.ForeignKey(
                        name: "FK_ProviderServiceCategories_ProviderProfiles_ProviderProfileId",
                        column: x => x.ProviderProfileId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderServiceCategories_ServiceCategories_ServiceCategori~",
                        column: x => x.ServiceCategoriesId,
                        principalTable: "ServiceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderServiceCategories_ServiceCategoriesId",
                table: "ProviderServiceCategories",
                column: "ServiceCategoriesId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderServiceCategories");

            migrationBuilder.DropColumn(
                name: "IconUrl",
                table: "ServiceCategories");

            migrationBuilder.CreateTable(
                name: "SkillCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IconUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProviderSkillCategories",
                columns: table => new
                {
                    ProvidersId = table.Column<Guid>(type: "uuid", nullable: false),
                    SkillCategoriesId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderSkillCategories", x => new { x.ProvidersId, x.SkillCategoriesId });
                    table.ForeignKey(
                        name: "FK_ProviderSkillCategories_ProviderProfiles_ProvidersId",
                        column: x => x.ProvidersId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderSkillCategories_SkillCategories_SkillCategoriesId",
                        column: x => x.SkillCategoriesId,
                        principalTable: "SkillCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderSkillCategories_SkillCategoriesId",
                table: "ProviderSkillCategories",
                column: "SkillCategoriesId");

            migrationBuilder.CreateIndex(
                name: "IX_SkillCategories_Name",
                table: "SkillCategories",
                column: "Name",
                unique: true);
        }
    }
}
