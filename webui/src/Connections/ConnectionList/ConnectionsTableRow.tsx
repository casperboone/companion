import { CFormSwitch, CPopover, CButtonGroup, CButton } from '@coreui/react'
import {
	faExclamationTriangle,
	faQuestionCircle,
	faBug,
	faDollarSign,
	faTerminal,
	faTrash,
	faEllipsisV,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { observer } from 'mobx-react-lite'
import React, { useContext, useCallback } from 'react'
import { Tuck } from '~/Components/Tuck.js'
import { windowLinkOpen } from '~/Helpers/Window.js'
import { RootAppStoreContext } from '~/Stores/RootAppStore.js'
import { UpdateConnectionToLatestButton } from '../UpdateConnectionToLatestButton.js'
import { getModuleVersionInfoForConnection } from '../Util.js'
import { ClientConnectionConfigWithId } from './ConnectionList.js'
import { ConnectionStatusCell } from './ConnectionStatusCell.js'
import { useConnectionListContext } from './ConnectionListContext.js'

interface ConnectionsTableRowProps {
	connection: ClientConnectionConfigWithId
	isSelected: boolean
}
export const ConnectionsTableRow = observer(function ConnectionsTableRow({
	connection,
	isSelected,
}: ConnectionsTableRowProps) {
	const { socket, helpViewer, modules, variablesStore } = useContext(RootAppStoreContext)
	const { showVariables, deleteModalRef, configureConnection } = useConnectionListContext()

	const id = connection.id
	const moduleInfo = modules.modules.get(connection.instance_type)

	const isEnabled = connection.enabled === undefined || connection.enabled

	const doDelete = useCallback(() => {
		deleteModalRef.current?.show(
			'Delete connection',
			[
				`Are you sure you want to delete "${connection.label}"?`,
				'This will remove all actions and feedbacks associated with this connection.',
			],
			'Delete',
			() => {
				socket.emitPromise('connections:delete', [id]).catch((e) => {
					console.error('Delete failed', e)
				})
				configureConnection(null)
			}
		)
	}, [socket, deleteModalRef, id, connection.label, configureConnection])

	const doToggleEnabled = useCallback(() => {
		socket.emitPromise('connections:set-enabled', [id, !isEnabled]).catch((e) => {
			console.error('Set enabled failed', e)
		})
	}, [socket, id, isEnabled])

	const doShowVariables = useCallback(() => showVariables(connection.label), [showVariables, connection.label])

	const connectionVariables = variablesStore.variables.get(connection.label)

	const editClickId = isSelected ? null : id // If this row is selected, don't allow editing on click, as it will close the selection
	const doEdit = useCallback(() => configureConnection(editClickId), [configureConnection, editClickId])

	const openBugUrl = useCallback(() => {
		const url = moduleInfo?.display?.bugUrl
		if (url) windowLinkOpen({ href: url })
	}, [moduleInfo])

	const moduleVersion = getModuleVersionInfoForConnection(moduleInfo, connection.moduleVersionId)

	const doShowHelp = useCallback(
		() =>
			moduleVersion?.helpPath &&
			helpViewer.current?.showFromUrl(connection.instance_type, moduleVersion.versionId, moduleVersion.helpPath),
		[helpViewer, connection.instance_type, moduleVersion]
	)

	return (
		<div onClick={doEdit} className="flex flex-row align-items-center gap-2 hand">
			<div className="flex flex-column grow">
				<b>{connection.label}</b>
				{moduleInfo ? (
					<span>
						{moduleInfo.display.manufacturer ?? ''}: {moduleInfo.display.products?.join('; ') ?? ''}
					</span>
				) : (
					<span>{connection.instance_type}</span>
				)}
			</div>

			<div className="no-break">
				{moduleVersion?.isLegacy && (
					<>
						<FontAwesomeIcon
							icon={faExclamationTriangle}
							color="#f80"
							title="This module has not been updated for Companion 3.0, and may not work fully"
						/>{' '}
					</>
				)}
				{moduleVersion?.displayName ?? connection.moduleVersionId}

				<UpdateConnectionToLatestButton connection={connection} />
			</div>
			<div className="ms-2">
				<ConnectionStatusCell isEnabled={isEnabled} status={connection.status} />
			</div>
			<div className="flex">
				<CFormSwitch
					className="ms-2"
					disabled={!moduleInfo || !moduleVersion}
					color="success"
					checked={isEnabled}
					onChange={doToggleEnabled}
					size="xl"
					title={isEnabled ? 'Disable connection' : 'Enable connection'}
				/>
				<CPopover
					trigger="focus"
					placement="right"
					style={{ backgroundColor: 'white' }}
					content={
						<>
							{/* Note: the popover closing due to focus loss stops mouseup/click events propagating */}
							<CButtonGroup vertical>
								<CButton
									onMouseDown={doShowHelp}
									color="secondary"
									title="Help"
									disabled={!moduleVersion?.helpPath}
									style={{ textAlign: 'left' }}
								>
									<Tuck>
										<FontAwesomeIcon icon={faQuestionCircle} />
									</Tuck>
									Help
								</CButton>

								<CButton
									onMouseDown={openBugUrl}
									color="secondary"
									title="Issue Tracker"
									disabled={!moduleInfo?.display?.bugUrl}
									style={{ textAlign: 'left' }}
								>
									<Tuck>
										<FontAwesomeIcon icon={faBug} />
									</Tuck>
									Known issues
								</CButton>

								<CButton
									onMouseDown={doShowVariables}
									title="Variables"
									color="secondary"
									disabled={!isEnabled || !(connectionVariables && connectionVariables.size > 0)}
									style={{ textAlign: 'left' }}
								>
									<Tuck>
										<FontAwesomeIcon icon={faDollarSign} />
									</Tuck>
									Variables
								</CButton>

								<CButton
									onMouseDown={() => windowLinkOpen({ href: `/connection-debug/${id}`, title: 'View debug log' })}
									title="Logs"
									color="secondary"
									style={{ textAlign: 'left' }}
								>
									<Tuck>
										<FontAwesomeIcon icon={faTerminal} />
									</Tuck>
									View logs
								</CButton>

								<CButton onMouseDown={doDelete} title="Delete" color="secondary" style={{ textAlign: 'left' }}>
									<Tuck>
										<FontAwesomeIcon icon={faTrash} />
									</Tuck>
									Delete
								</CButton>
							</CButtonGroup>
						</>
					}
				>
					<CButton color="secondary" style={{ padding: '3px 16px' }} onClick={(e) => e.currentTarget.focus()}>
						<FontAwesomeIcon icon={faEllipsisV} />
					</CButton>
				</CPopover>
			</div>
		</div>
	)
})
