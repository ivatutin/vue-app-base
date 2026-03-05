/**
 * main.ts
 */
import App from '@/app/App.vue'
import { setupProviders } from '@/app/providers'
import { runBootstrapProcess } from '@/processes/app-bootstrap'
import 'unfonts.css'

async function bootstrapApplication() {
    const app = createApp(App)
    const { router } = setupProviders(app)
    app.mount('#app')
    await runBootstrapProcess({ router })
}

// async function bootstrapApplication() {
//     console.log('bootstrapApplication')
//     const app = createApp(App)
//     console.log('createApp')
//     const { router } = setupProviders(app)
//     console.log('setupProviders')
//     try {
//         console.log('start runBootstrapProcess')
//         await runBootstrapProcess()
//         console.log('end runBootstrapProcess')
//     } catch (e) {
//         console.log(e)
//     }
//     await router.isReady()
//     app.mount('#app')
// }

bootstrapApplication()