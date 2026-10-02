import path from "path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

function startupBannerPlugin(apiUrl: string, agentUrl: string, mode: string): Plugin {
  return {
    name: "startup-banner",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const isLocal = apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
        const targetType = isLocal
          ? "\x1b[32m[LOCAL BACKEND]\x1b[0m"
          : "\x1b[35m[DEPLOYED AZURE BACKEND]\x1b[0m";

        console.log(
          "\n\x1b[36m================================================================\x1b[0m",
        );
        console.log("\x1b[1m🌐  HANDEE REACT WEB PORTAL STARTED\x1b[0m");
        console.log(
          "\x1b[36m================================================================\x1b[0m",
        );
        console.log(` \x1b[33m⚙️  Vite Mode      :\x1b[0m ${mode}`);
        console.log(` \x1b[34m🎯 Target Backend :\x1b[0m ${targetType} ${apiUrl}`);
        console.log(` \x1b[35m🤖 AI Agent URL   :\x1b[0m ${agentUrl}`);
        console.log(
          " \x1b[90m💡 Tip: Run 'npm run dev:local' for Local or 'npm run dev:cloud' for Azure.\x1b[0m",
        );
        console.log(
          "\x1b[36m================================================================\x1b[0m\n",
        );
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:5057";
  const agentUrl = env.VITE_AGENT_SERVICE_URL || "http://localhost:8000";

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      startupBannerPlugin(apiUrl, agentUrl, mode),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
    },
  };
});
