import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// SUPABASE_URL / SUPABASE_ANON_KEY という名前でも動くように、この2キーだけを
// 明示的にマッピングする。envPrefix を SUPABASE_ に広げてはいけない
// （SUPABASE_SERVICE_ROLE_KEY が同じ環境に置かれた場合、バンドルに混入する）。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? '',
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? '',
      ),
    },
  }
})
