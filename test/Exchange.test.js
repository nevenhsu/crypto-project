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

        describe('failure', () => {
            it('rejects with insufficient Ether', async () => {
                await exchange
                    .withdrawEther(ether(1), {
                        from: accounts[2],
                    })
                    .should.be.rejectedWith(EVENT_REVERT)
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

    describe('withdrawing token', () => {
        describe('success', () => {
            let result
            let amount = tokens(10)

            beforeEach(async () => {
                await token.transfer(accounts[2], amount, { from: accounts[0] })
                await token.approve(exchange.address, amount, {
                    from: accounts[2],
                })
                await exchange.deposit(token.address, amount, {
                    from: accounts[2],
                })
                result = await exchange.withdraw(token.address, amount, {
                    from: accounts[2],
                })
            })

            it('withdraws tokens', async () => {
                const balance = await exchange.tokens(
                    token.address,
                    accounts[2]
                )
                balance.toString().should.equal('0')
            })

            it('emits Withdraw event', () => {
                const [log] = result.logs
                const { event, args } = log
                event.should.equal('Withdraw')
                const {
                    token: tokenAddress,
                    sender,
                    amount: ether,
                    balance,
                } = args
                tokenAddress.should.be.equal(token.address)
                sender.should.be.equal(accounts[2])
                ether.toString().should.be.equal(amount.toString())
                balance.toString().should.be.equal('0')
            })
        })
        describe('failure', () => {
            it('rejects with withdrawing Ether', async () => {
                await exchange
                    .withdraw(ETHER_ADDRESS, tokens(1), { from: accounts[2] })
                    .should.be.rejectedWith(EVENT_REVERT)
            })

            it('rejects with insufficient tokens', async () => {
                await exchange
                    .withdraw(token.address, tokens(1), { from: accounts[2] })
                    .should.be.rejectedWith(EVENT_REVERT)
            })
        })
    })

    describe('checking token balance', () => {
        const amount = ether(1)
        beforeEach(async () => {
            await exchange.depositEther({ from: accounts[2], value: amount })
        })
        it('checks ether balance', async () => {
            const balance = await exchange.balanceOf(ETHER_ADDRESS, accounts[2])
            balance.toString().should.equal(amount.toString())
        })
    })

    describe('making orders', () => {
        let result
        let amount = tokens(1)
        beforeEach(async () => {
            result = await exchange.makeOrder(
                token.address,
                amount,
                ETHER_ADDRESS,
                amount,
                { from: accounts[0] }
            )
        })
        it('tracks the newly order', async () => {
            const order = await exchange.orders(1)
            const { id } = order
            id.toString().should.equal('1')
        })
        it('emits Order event', () => {
            const [log] = result.logs
            const { event, args } = log
            event.should.equal('Order')
            const {
                id,
                user,
                tokenGet,
                amountGet,
                tokenGive,
                amountGive,
                timestamp,
            } = args
            id.toString().should.be.equal('1')
            user.should.be.equal(accounts[0])
            tokenGet.toString().should.be.equal(token.address)
            amountGet.toString().should.be.equal(amount.toString())
            tokenGive.toString().should.be.equal(ETHER_ADDRESS)
            amountGive.toString().should.be.equal(amount.toString())
        })
    })
    describe('cancelling orders', () => {
        let orderId
        let result
        let amount = tokens(1)

        beforeEach(async () => {
            const orderResult = await exchange.makeOrder(
                token.address,
                amount,
                ETHER_ADDRESS,
                amount,
                { from: accounts[0] }
            )

            orderId = orderResult.logs[0].args.id.toString()

            result = await exchange.cancelOrder(orderId, {
                from: accounts[0],
            })
        })

        describe('success', () => {
            it('cancels order', async () => {
                const cancelled = await exchange.orderCancelled(orderId, {
                    from: accounts[0],
                })
                cancelled.should.equal(true)
            })

            it('emits cancel event', async () => {
                const [log] = result.logs
                const { event, args } = log
                event.should.equal('Cancel')
                const { id, user } = args
                id.toString().should.be.equal(orderId)
                user.should.be.equal(accounts[0])
            })
        })
    })
})
