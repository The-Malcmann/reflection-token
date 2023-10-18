// inspired by: https://github.com/abdelhamidbakhta/token-vesting-contracts/blob/main/contracts/TokenVesting.sol
// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

interface ITokenVestingBase {
    function getVestingSchedulesCountByBeneficiary(address _beneficiary)
        external
        view
        returns (uint256);

    function getVestingIdAtIndex(uint256 index) external view returns (bytes32);

    /*
     * @notice Returns the total amount of vesting schedules.
     * @return the total amount of vesting schedules
     */
    function getVestingSchedulesTotalAmount() external view returns (uint256);

    function getToken() external view returns (address);

    /*
     * @notice Creates a new vesting schedule for a beneficiary.
     * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param _start start time of the vesting period
     * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
     * @param _duration duration in seconds of the period in which the tokens will vest
     * @param _slicePeriodSeconds duration of a slice period for the vesting in seconds
     * @param _revocable whether the vesting is revocable or not
     * @param _amount total amount of tokens to be released at the end of the vesting
     */
    function createVestingSchedule(
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        uint256 _slicePeriodSeconds,
        bool _revocable,
        uint256 _amount
    ) external;

    function revoke(bytes32 vestingScheduleId) external;

    function withdraw(uint256 amount) external;

    function release(bytes32 vestingScheduleId, uint256 amount) external;

    function getVestingSchedulesCount() external view returns (uint256);

    function computeReleasableAmount(bytes32 vestingScheduleId)
        external
        view
        returns (uint256);

    function getWithdrawableAmount() external view returns (uint256);

    function computeNextVestingScheduleIdForHolder(address holder)
        external
        view
        returns (bytes32);

    function computeLatestVestingScheduleIdForHolder(address holder)
        external
        view
        returns (bytes32);

    function computeVestingScheduleIdForAddressAndIndex(
        address holder,
        uint256 index
    ) external pure returns (bytes32);
}