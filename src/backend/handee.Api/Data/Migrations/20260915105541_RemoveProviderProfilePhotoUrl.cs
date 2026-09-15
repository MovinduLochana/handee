using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace handee.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveProviderProfilePhotoUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePhotoUrl",
                table: "ProviderProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfilePhotoUrl",
                table: "ProviderProfiles",
                type: "text",
                nullable: true);
        }
    }
}
