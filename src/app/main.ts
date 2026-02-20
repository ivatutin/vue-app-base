/**
 * main.ts
 */
import App from '@/app/App.vue'
import { setupProviders } from '@/app/providers'
import { runBootstrapProcess } from '@/processes/app-bootstrap'
import 'unfonts.css'

async function bootstrapApplication() {
    console.log('bootstrapApplication')
    const app = createApp(App)
    console.log('createApp')
    const { router } = setupProviders(app)
    console.log('setupProviders')
    try {
        await runBootstrapProcess()
    } catch (e) {
        console.log(e)
    }
    await router.isReady()
    app.mount('#app')
}


bootstrapApplication()