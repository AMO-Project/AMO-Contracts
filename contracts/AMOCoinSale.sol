pragma solidity ^0.4.18;

import "./AMOCoin.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract AMOCoinSale is Pausable {
    using SafeMath for uint256;

    // Start time of sale
    uint256 public startTime;
    // End time of sale
    uint256 public endTime;
    // Address to collect fund
    address private fundAddr;
    // Token contract instance
    AMOCoin public token;
    // Amount of raised in Wei (1 ether)
    uint256 public totalWeiRaised;
    // Base hard cap for each round in ether
    uint256 public constant BASE_HARD_CAP_PER_ROUND = 20000 * 1 ether;

    uint256 public constant UINT256_MAX = ~uint256(0);
    // Base AMO to Ether rate
    uint256 public constant BASE_AMO_TO_ETH_RATE = 100000;
    // Base minimum contribution
    uint256 public constant BASE_MIN_CONTRIBUTION = 0.1 * 1 ether;
    // Whitelisted addresses
    mapping(address => bool) public whitelist;
    // Whitelisted users' contributions per round
    mapping(address => mapping(uint8 => uint256)) public contPerRound;

    // For each round, there are three stages.
    enum Stages {
        SetUp,
        Started,
        Ended
    }
    // The current stage of the sale
    Stages public stage;

    // There are three rounds in sale
    enum SaleRounds {
        EarlyInvestment,
        PreSale,
        CrowdSale
    }
    // The current round of the sale
    SaleRounds public round;

    // Each round has different inforamation
    struct RoundInfo {
        uint256 minContribution;
        uint256 maxContribution;
        uint256 hardCap;
        uint256 rate;
        uint256 weiRaised;
    }

    // SaleRounds(key) : RoundInfo(value) map
    // Since solidity does not support enum as key of map, converted enum to uint8
    mapping(uint8 => RoundInfo) roundInfos;

    /*
     * Event for sale start logging
     *
     * @param startTime: Start date of sale
     * @param endTime: End date of sale
     * @param round: Round of sale started
     */
    event SaleStarted(uint256 startTime, uint256 endTime, SaleRounds round);

    /*
     * Event for sale end logging
     *
     * @param endTime: End date of sale
     * @param totalWeiRaised: Total amount of raised in Wei after sale ended
     * @param round: Round of sale ended
     */
    event SaleEnded(uint256 endTime, uint256 totalWeiRaised, SaleRounds round);

    /*
     * Event for token purchase
     *
     * @param purchaser: Who paid for the tokens
     * @param value: Amount in Wei paid for purchase
     * @param amount: Amount of tokens purchased
     */
    event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount);

    /*
     * Modifier to check current stage is same as expected stage
     *
     * @param expectedStage: Expected current stage
     */
    modifier atStage(Stages expectedStage) {
        require(stage == expectedStage);
        _;
    }

    /*
     * Modifier to check current round is sane as expected round
     *
     * @param expectedRound: Expected current round
     */
    modifier atRound(SaleRounds expectedRound) {
        require(round == expectedRound);
        _;
    }

    /*
     * Modifier to check purchase is valid
     *
     * 1. Current round must be smaller than CrowdSale
     * 2. Current time must be within sale period
     * 3. Purchaser must be enrolled to whitelist
     * 4. Purchaser address must be correct
     * 5. Contribution must be bigger than minimum contribution for current round
     * 6. Sum of contributions must be smaller than max contribution for current round
     * 7. Total funds raised in current round must be smaller than hard cap for current round
     */
    modifier onlyValidPurchase() {
        require(round <= SaleRounds.CrowdSale);
        require(now >= startTime && now <= endTime);

        uint256 contributionInWei = msg.value;
        address purchaser = msg.sender;

        require(whitelist[purchaser]);
        require(purchaser != address(0));
        require(contributionInWei >= roundInfos[uint8(round)].minContribution);
        require(
            contPerRound[purchaser][uint8(round)].add(contributionInWei)
            <= roundInfos[uint8(round)].maxContribution
        );
        require(
            roundInfos[uint8(round)].weiRaised.add(contributionInWei)
            <= roundInfos[uint8(round)].hardCap
        );
        _;
    }

    /*
     * Constructor for AMOCoinSale contract
     *
     * @param AMOToEtherRate: Number of AMO tokens per Ether
     * @param fundAddress: Address where funds are collected
     * @param tokenAddress: Address of AMO Token Contract
     */
    function AMOCoinSale(
        address fundAddress,
        address tokenAddress
    )
        public
    {
        require(fundAddress != address(0));
        require(tokenAddress != address(0));

        token = AMOCoin(tokenAddress);
        fundAddr = fundAddress;
        stage = Stages.Ended;
        round = SaleRounds.EarlyInvestment;
        uint8 roundIndex = uint8(round);

        roundInfos[roundIndex].minContribution = BASE_MIN_CONTRIBUTION;
        roundInfos[roundIndex].maxContribution = UINT256_MAX;
        roundInfos[roundIndex].hardCap = BASE_HARD_CAP_PER_ROUND;
        roundInfos[roundIndex].weiRaised = 0;
        roundInfos[roundIndex].rate = BASE_AMO_TO_ETH_RATE;
    }

    /*
     * Fallback function to buy AMO tokens
     */
    function () public payable {
        buy();
    }

    /*
     * Withdraw ethers to fund address
     */
    function withdraw() external onlyOwner {
        fundAddr.transfer(this.balance);
    }

    /*
     * Add users to whitelist
     * Whitelisted users are accumulated on each round
     *
     * @param users: Addresses of users who passed KYC
     */
    function addManyToWhitelist(address[] users) public onlyOwner {
        for (uint32 i = 0; i < users.length; i++) {
            addToWhitelist(users[i]);
        }
    }

    /*
     * Add one user to whitelist
     *
     * @param user: Address of user who passed KYC
     */
    function addToWhitelist(address user) public onlyOwner {
        whitelist[user] = true;
    }

    /*
     * Remove users from whitelist
     *
     * @param users: Addresses of users who should not belong to whitelist
     */
    function removeManyFromWhitelist(address[] users) public onlyOwner {
        for (uint32 i = 0; i < users.length; i++) {
            removeFromWhitelist(users[i]);
        }
    }

    /*
     * Remove users from whitelist
     *
     * @param users: Addresses of users who should not belong to whitelist
     */
    function removeFromWhitelist(address user) public onlyOwner {
        whitelist[user] = false;
    }

    /*
     * Set minimum contribution for round
     * User have to send more ether than minimum contribution
     *
     * @param _round: Round to set
     * @param _minContribution: Minimum contribution in wei
     */
    function setMinContributionForRound(
        SaleRounds _round,
        uint256 _minContribution
    )
        public
        onlyOwner
        atStage(Stages.SetUp)
    {
        require(round <= _round);
        roundInfos[uint8(_round)].minContribution =
            (_minContribution == 0) ? BASE_MIN_CONTRIBUTION : _minContribution;
    }

    /*
     * Set max contribution for round
     * User can't send more ether than the max contributions in round
     *
     * @param _round: Round to set
     * @param _maxContribution: Max contribution in wei
     */
    function setMaxContributionForRound(
        SaleRounds _round,
        uint256 _maxContribution
    )
        public
        onlyOwner
        atStage(Stages.SetUp)
    {
        require(round <= _round);
        roundInfos[uint8(_round)].maxContribution =
            (_maxContribution == 0) ? UINT256_MAX : _maxContribution;
    }

    /*
     * Set hard cap for round
     * Total wei raised in round should be smaller than hard cap
     *
     * @param _round: Round to set
     * @param _hardCap: Hard cap in wei
     */
    function setHardCapForRound(
        SaleRounds _round,
        uint256 _hardCap
    )
        public
        onlyOwner
        atStage(Stages.SetUp)
    {
        require(round <= _round);
        roundInfos[uint8(_round)].hardCap =
            (_hardCap == 0) ? BASE_HARD_CAP_PER_ROUND : _hardCap;
    }

    /*
     * Set AMO to Ether rate for round
     *
     * @param _round: Round to set
     * @param _rate: AMO to Ether _rate
     */
    function setRateForRound(
        SaleRounds _round,
        uint256 _rate
    )
        public
        onlyOwner
        atStage(Stages.SetUp)
    {
        require(round <= _round);
        roundInfos[uint8(_round)].rate =
            (_rate == 0) ? BASE_AMO_TO_ETH_RATE : _rate;
    }

    /*
     * Set up several information for next round
     * Only owner can call this method
     */
    function setUpSale(
        SaleRounds _round,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _hardCap,
        uint256 _rate
    )
        external
        onlyOwner
        atStage(Stages.Ended)
    {
        require(round <= _round);
        stage = Stages.SetUp;
        round = _round;
        setMinContributionForRound(_round, _minContribution);
        setMaxContributionForRound(_round, _maxContribution);
        setHardCapForRound(_round, _hardCap);
        setRateForRound(_round, _rate);
    }

    /*
     * Start sale in current round
     */
    function startSale(uint256 durationInSeconds)
        external
        onlyOwner
        atStage(Stages.SetUp)
    {
        require(roundInfos[uint8(round)].minContribution > 0
            && roundInfos[uint8(round)].hardCap > 0);
        stage = Stages.Started;
        startTime = now;
        endTime = startTime.add(durationInSeconds);
        SaleStarted(startTime, endTime, round);
    }

    /*
     * End sale in crrent round
     */
    function endSale() external onlyOwner atStage(Stages.Started) {
        endTime = now;
        stage = Stages.Ended;

        SaleEnded(endTime, totalWeiRaised, round);
    }

    function buy()
        public
        payable
        whenNotPaused
        atStage(Stages.Started)
        onlyValidPurchase()
        returns (bool)
    {
        address purchaser = msg.sender;
        uint256 contributionInWei = msg.value;
        uint256 tokenAmount = contributionInWei.mul(roundInfos[uint8(round)].rate);

        if (!token.transferFrom(token.owner(), purchaser, tokenAmount)) {
            revert();
        }

        totalWeiRaised = totalWeiRaised.add(contributionInWei);
        roundInfos[uint8(round)].weiRaised =
            roundInfos[uint8(round)].weiRaised.add(contributionInWei);

        contPerRound[purchaser][uint8(round)] =
            contPerRound[purchaser][uint8(round)].add(contributionInWei);

        // Transfer contributions to fund address
        fundAddr.transfer(contributionInWei);
        TokenPurchase(msg.sender, contributionInWei, tokenAmount);

        return true;
    }

    function isSaleEnded() public view returns (bool) {
        return stage == Stages.Ended;
    }


}
