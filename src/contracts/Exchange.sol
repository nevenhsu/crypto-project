pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/math/SafeMath.sol';
import './Token.sol';

// Deposit & Withdraw Funds
// Manage Orders - Make and Cancel
// Handle Trades - Charge Fees

// [X] Set the fee
// [X] Deposit Ether
// [ ] Withdraw Ether
// [X] Deposit tokens
// [ ] Withdraw tokens
// [ ] Check balances
// [ ] Make order
// [ ] Cancel order
// [ ] Fill order
// [ ] Charge fees

contract Exchange {
    using SafeMath for uint256;

    address public feeAccount;
    uint256 public feePercent;
    address constant ETHER = address(0);

    mapping(address => mapping(address => uint256)) public tokens;

    event Deposit(
        address token,
        address sender,
        uint256 amount,
        uint256 balance
    );

    event Withdraw(
        address token,
        address sender,
        uint256 amount,
        uint256 balance
    );

    constructor(address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    fallback() external {
        revert();
    }

    function depositEther() public payable {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint256 _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    function deposit(address _token, uint256 _amount) public {
        // Don't allow ether deposit
        require(_token != ETHER);
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // send token to this contract
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }
}
