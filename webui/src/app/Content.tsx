import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CardContent, CardHeader } from '@/components/ui/card'
import { ConnectionTab } from './ConnectionTab'
import { JSX } from 'react'

const queryClient = new QueryClient()

export function AppContent(): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<CardHeader className="text-center pb-3">
				<h2 className="text-xl font-semibold">MIDI Button Pusher</h2>
			</CardHeader>
			<CardContent>
				<ConnectionTab />
			</CardContent>
		</QueryClientProvider>
	)
}
