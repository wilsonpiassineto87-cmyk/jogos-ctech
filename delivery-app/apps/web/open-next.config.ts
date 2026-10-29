import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Todas as páginas com dados são dinâmicas, então não há cache incremental (R2) por enquanto.
export default defineCloudflareConfig();
