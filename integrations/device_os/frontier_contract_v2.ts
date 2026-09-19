/** Device OS ↔ gunnchAI frontier contract v2 */
export interface DeviceOsFrontierContractV2 {
  schema: 'gunnchai.device_os.frontier_contract.v2';
  surfaces: Array<'diagnostics' | 'assist' | 'privacy_gate' | 'offline_degrade'>;
  rules: {
    device_local_privacy_preferred: true;
    cloud_opt_in_consent: true;
    fail_closed_on_policy_miss: true;
    model_owned_shell_authority: false;
  };
}

export const DEVICE_OS_FRONTIER_CONTRACT_V2: DeviceOsFrontierContractV2 = {
  schema: 'gunnchai.device_os.frontier_contract.v2',
  surfaces: ['diagnostics', 'assist', 'privacy_gate', 'offline_degrade'],
  rules: {
    device_local_privacy_preferred: true,
    cloud_opt_in_consent: true,
    fail_closed_on_policy_miss: true,
    model_owned_shell_authority: false,
  },
};
