import { ether, tokens, EVENT_REVERT, ETHER_ADDRESS } from './helper'

const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

require('chai').use(require('chai-as-promised')).should()

contract('Exchange', (accounts) => {
    let token
    let exchange
    const feePercent = 10

    beforeEach(async () => {
        token = await Token.new()
        exchange = await Exchange.new(accounts[1], feePercent)
        await token.transfer(accounts[2], tokens(100), { from: accounts[0] })
    })

    describe('deployment', () => {
        it('tracks the fee account', async () => {
            const result = await exchange.feeAccount()
            result.should.equal(accounts[1])
        })
        it('tracks the fee percent', async () => {
            const result = await exchange.feePercent()
            result.toString().should.equal('10')
        })
    })

    describe('fallback', () => {
        it('revert when Ethers is sent', async () => {
            await exchange
                .sendTransaction({ value: ether(1), from: accounts[2] })
                .should.be.rejectedWith(EVENT_REVERT)
        })
    })

    describe('depositing Ether', () => {
        let result
        let amount = ether(1)

        beforeEach(async () => {
            result = await exchange.depositEther({
                from: accounts[2],
                value: amount,
            })
        })

        it('tracks Ether balance', async () => {
            let balance = await exchange.tokens(ETHER_ADDRESS, accounts[2])
            balance.toString().should.equal(amount.toString())
        })

        it('emits Deposit event', () => {
            const [log] = result.logs
            const { event, args } = log
            event.should.equal('Deposit')
            const { token: etherAddress, sender, amount: ether, balance } = args
            etherAddress.should.be.equal(ETHER_ADDRESS)
            sender.should.be.equal(accounts[2])
            ether.toString().should.be.equal(amount.toString())
            balance.toString().should.be.equal(amount.toString())
        })
    })

    describe('withdrawing Ether', () => {
        let result
        let amount = ether(1)

        describe('success', () => {
            beforeEach(async () => {
                await exchange.depositEther({
                    from: accounts[2],
                    value: amount,
                })
                result = await exchange.withdrawEther(amount, {
                    from: accounts[2],
                })
            })

            it('withdraws Ether funds', async () => {
                const balance = await exchange.tokens(
                    ETHER_ADDRESS,
                    accounts[2],
                    {
                        from: accounts[2],
                    }
                )
                balance.toString().should.equal('0')
            })

            it('emits Withdraw event', () => {
                const [log] = result.logs
                const { event, args } = log
                event.should.equal('Withdraw')
                const {
                    token: etherAddress,
                    sender,
                    amount: ether,
                    balance,
                } = args
                etherAddress.should.be.equal(ETHER_ADDRESS)
                sender.should.be.equal(accounts[2])
                ether.toString().should.be.equal(amount.toString())
                balance.toString().should.be.equal('0')
            })
        })
    })

    describe('depositing token', () => {
        let result
        let amount

        describe('success', () => {
            beforeEach(async () => {
                amount = tokens(10)

                await token.approve(exchange.address, amount, {
                    from: accounts[2],
                })
                result = await exchange.deposit(token.address, amount, {
                    from: accounts[2],
                })
            })

            it('tracks the token deposit', async () => {
                let balance
                // check balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                // check token on exchange
                balance = await exchange.tokens(token.address, accounts[2])
                balance.toString().should.equal(amount.toString())
            })

            it('emits a Deposit event', () => {
                const [log] = result.logs
                const { event, args } = log
                event.should.equal('Deposit')
                const {
                    token: tokenAddress,
                    sender,
                    amount: tokens,
                    balance,
                } = args
                tokenAddress.should.be.equal(token.address)
                sender.should.be.equal(accounts[2])
                tokens.toString().should.be.equal(amount.toString())
                balance.toString().should.be.equal(amount.toString())
            })
        })
        describe('failure', () => {
            it('rejects depositing with Ether', async () => {
                amount = tokens(10)

                await token.approve(exchange.address, amount, {
                    from: accounts[2],
                })

                await exchange
                    .deposit(ETHER_ADDRESS, amount, {
                        from: accounts[2],
                    })
                    .should.be.rejectedWith(EVENT_REVERT)
            })
            it('rejects when no token is approved', async () => {
                await exchange
                    .deposit(token.address, tokens(10), {
                        from: accounts[2],
                    })
                    .should.be.rejectedWith(EVENT_REVERT)
            })
        })
    })
})
