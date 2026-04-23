import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useForm } from '@tanstack/react-form'
import type { ApiConfigData } from '../Api/types.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSatelliteApi } from '@/Api/Context.js'
import { Button } from '@/components/ui/button.js'
import { Switch } from '@/components/ui/switch.js'
import React, { JSX } from 'react'
import { CONNECTION_CONFIG_QUERY_KEY, CONNECTION_STATUS_QUERY_KEY, MIDI_PORTS_QUERY_KEY } from './constants.js'
import { BarLoader } from 'react-spinners'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js'
import { cn } from '@/lib/utils.js'

const MIDI_PORT_TYPE_ITEMS = [
	{ value: 'virtual', label: 'Custom Virtual Port' },
	{ value: 'named', label: 'Existing MIDI Input Port' },
]

export function ConnectionConfig(): JSX.Element {
	const api = useSatelliteApi()
	const config = useQuery({ queryKey: [CONNECTION_CONFIG_QUERY_KEY], queryFn: api.getConfig, refetchInterval: 5000 })

	return (
		<div>
			<h3 className="text-2xl font-bold dark:text-white">Configuration</h3>

			{config.isLoading ? <BarLoader color="#ffffff" className="mt-4" /> : null}
			{config.error ? <p>Error: {config.error.message.toString()}</p> : null}
			{config.data ? <ConnectionConfigContent config={config.data} /> : null}
		</div>
	)
}

function ConnectionConfigContent({ config }: { config: ApiConfigData }): JSX.Element {
	const api = useSatelliteApi()
	const queryClient = useQueryClient()
	const midiPorts = useQuery<string[]>({
		queryKey: [MIDI_PORTS_QUERY_KEY],
		queryFn: api.getMidiPorts,
		refetchInterval: 5000,
	})

	const form = useForm({
		defaultValues: config,
		onSubmit: async ({ value }) => {
			await api.saveConfig(value)
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: [CONNECTION_STATUS_QUERY_KEY] }),
				queryClient.invalidateQueries({ queryKey: [CONNECTION_CONFIG_QUERY_KEY] }),
				queryClient.invalidateQueries({ queryKey: [MIDI_PORTS_QUERY_KEY] }),
			])
		},
	})

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit().catch((e) => console.error(e))
			}}
		>
			<div className="grid gap-3 grid-cols-4 mt-2">
				<legend className="col-span-3 col-start-2 px-1">Companion HTTP</legend>

				<form.Field
					name="companionHost"
					children={(field) => (
						<FormRow label="Companion Host" htmlFor={field.name}>
							<Input
								type="text"
								id={field.name}
								name={field.name}
								placeholder="127.0.0.1"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</FormRow>
					)}
				/>
				<form.Field
					name="companionPort"
					children={(field) => (
						<FormRow label="Companion Port" htmlFor={field.name}>
							<Input
								type="number"
								id={field.name}
								name={field.name}
								placeholder="8000"
								min={1}
								max={65535}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(Number(e.target.value))}
							/>
						</FormRow>
					)}
				/>

				<hr className="col-span-3 col-start-2" />
				<legend className="col-span-3 col-start-2 px-1">MIDI Button Pusher</legend>

				<form.Field
					name="midiPortType"
					children={(field) => (
						<FormRow
							label="MIDI Port Type"
							htmlFor={field.name}
							hint="Virtual = app creates a local destination. Named = connect to existing MIDI input port."
						>
							<Select
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value as 'virtual' | 'named')}
							>
								<SelectTrigger id={field.name} name={field.name} className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MIDI_PORT_TYPE_ITEMS.map((item) => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FormRow>
					)}
				/>

				<form.Field
					name="midiPortName"
					children={(field) => (
						<FormRow
							label="MIDI Port Name"
							htmlFor={field.name}
							hint={
								midiPorts.data?.length
									? `Detected inputs: ${midiPorts.data.join(', ')}`
									: 'No MIDI input ports detected yet. Virtual mode still works.'
							}
						>
							<Input
								type="text"
								id={field.name}
								name={field.name}
								placeholder="CompanionMidiSatellite"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</FormRow>
					)}
				/>

				<form.Field
					name="runAtStartup"
					children={(field) => (
						<FormRow label="Run at startup" htmlFor={field.name}>
							<Switch
								id={field.name}
								name={field.name}
								checked={field.state.value}
								onBlur={field.handleBlur}
								onCheckedChange={(checked) => field.handleChange(checked)}
							/>
						</FormRow>
					)}
				/>

				{api.includeApiEnable && (
					<>
						<hr className="col-span-3 col-start-2" />
						<legend className="col-span-3 col-start-2 px-1">HTTP Interface</legend>

						<form.Field
							name="httpEnabled"
							children={(field) => (
								<FormRow label="HTTP Enabled" htmlFor={field.name}>
									<Switch
										id={field.name}
										name={field.name}
										checked={field.state.value}
										onBlur={field.handleBlur}
										onCheckedChange={(checked) => field.handleChange(checked)}
									/>
								</FormRow>
							)}
						/>
						<form.Field
							name="httpPort"
							children={(field) => (
								<FormRow label="HTTP Port" htmlFor={field.name}>
									<Input
										type="number"
										id={field.name}
										name={field.name}
										placeholder="9999"
										min={1}
										max={65535}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(Number(e.target.value))}
									/>
								</FormRow>
							)}
						/>
					</>
				)}

				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
					children={([canSubmit, isSubmitting, isDirty]) => (
						<div className="col-span-3 col-start-2 flex justify-start">
							<Button type="submit" disabled={!canSubmit || !isDirty}>
								{isSubmitting ? '...' : 'Save'}
							</Button>
						</div>
					)}
				/>
			</div>
		</form>
	)
}

function FormRow({
	label,
	htmlFor,
	hint,
	hidden,
	children,
}: {
	label: string
	htmlFor: string
	hint?: string | React.ReactNode
	hidden?: boolean
	children: JSX.Element
}): JSX.Element {
	return (
		<>
			<Label className={cn('justify-self-end content-center', hidden && 'hidden')} htmlFor={htmlFor}>
				{label}
			</Label>
			<div className={cn('col-span-3', hidden && 'hidden')}>{children}</div>
			{hint && (
				<div className={cn('col-span-3 col-start-2 -mt-3', hidden && 'hidden')}>
					<p className="text-sm text-gray-500 p-1">{hint}</p>
				</div>
			)}
		</>
	)
}
