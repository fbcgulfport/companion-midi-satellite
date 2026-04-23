import { useSatelliteApi } from '@/Api/Context'
import type { ApiStatusResponse } from '../Api/types.js'
import { useQuery } from '@tanstack/react-query'
import { CONNECTION_STATUS_QUERY_KEY } from './constants'
import { JSX } from 'react'
import { CheckCircle2, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { NonIdealState } from '@/components/NonIdealState'

export function ConnectionStatus(): JSX.Element {
	const api = useSatelliteApi()
	const status = useQuery({ queryKey: [CONNECTION_STATUS_QUERY_KEY], queryFn: api.getStatus, refetchInterval: 2000 })

	return (
		<>
			{status.isLoading ? (
				<NonIdealState
					icon={Loader2}
					title="Loading..."
					iconClassName="h-12 w-12 text-blue-500 animate-spin"
					titleClassName="text-lg text-blue-600 dark:text-blue-400"
				/>
			) : null}
			{status.error ? (
				<NonIdealState
					icon={AlertTriangle}
					title="Error"
					description={status.error.toString()}
					iconClassName="h-12 w-12 text-red-500"
					titleClassName="text-lg text-red-600 dark:text-red-400"
				/>
			) : null}
			{status.data ? <ConnectionStatusData status={status.data} /> : null}
		</>
	)
}

function ConnectionStatusData({ status }: { status: ApiStatusResponse }) {
	if (!status.midiAvailable) {
		return (
			<NonIdealState
				icon={AlertCircle}
				title="MIDI Unavailable"
				description={status.lastError ?? 'MIDI input subsystem failed to initialize'}
				iconClassName="h-12 w-12 text-red-500"
				titleClassName="text-lg text-red-600 dark:text-red-400"
			/>
		)
	}

	if (status.midiPortOpen) {
		return (
			<NonIdealState
				icon={CheckCircle2}
				title="Ready"
				description={`Listening on ${status.midiPortType} port "${status.midiPortName}" -> ${status.companionHost}:${status.companionPort}`}
				iconClassName="h-12 w-12 text-green-500"
				titleClassName="text-lg text-green-600 dark:text-green-400"
			/>
		)
	}

	return (
		<NonIdealState
			icon={AlertCircle}
			title="MIDI Port Closed"
			description={status.lastError ?? 'Verify MIDI port name/type and sender routing'}
			iconClassName="h-12 w-12 text-amber-500"
			titleClassName="text-lg text-amber-600 dark:text-amber-400"
		/>
	)
}
