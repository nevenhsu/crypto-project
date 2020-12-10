import { tokens, EVENT_REVERT } from './helper'

const Token = artifacts.require('./Token')

require('chai').use(require('chai-as-promised')).should()

contract('Token', (accounts) => {
    let token
    const name = 'TokenName0'
    const symbol = 'TN'
    const decimals = 18
    const totalSupply = `${tokens(10 ** 6)}`

    beforeEach(async () => {
        token = await Token.new()
    })

    describe('deployment', () => {
        it('tracks the name', async () => {
            const result = await token.name()
            result.should.equal(name)
        })

        it('tracks the symbol', async () => {
            const result = await token.symbol()
            result.should.equal(symbol)
        })

        it('tracks the decimals', async () => {
            const result = await token.decimals()
            result.toString().should.equal(decimals.toString())
        })

        it('tracks the total supply', async () => {
            const result = await token.totalSupply()
            result.toString().should.equal(totalSupply)
        })

        it('assign the total supply to the deployer', async () => {
            const result = await token.balanceOf(accounts[0])
            result.toString().should.equal(totalSupply)
        })
    })

    describe('sending tokens', () => {
        describe('success', () => {
            let amount
            let result

            beforeEach(async () => {
                amount = tokens(100)
                result = await token.transfer(accounts[1], amount, {
                    from: accounts[0],
                })
            })

            it('transfer token balance', async () => {
                const deployer = await token.balanceOf(accounts[0])
                const receiver = await token.balanceOf(accounts[1])

                deployer
                    .toString()
                    .should.equal(tokens(10 ** 6 - 100).toString())
                receiver.toString().should.equal(amount.toString())
            })

            it('emits a Transfer event', () => {
                const [log] = result.logs
                const { event, args } = log
                const { from, to, tokens } = args
                event.should.equal('Transfer')
                from.should.equal(accounts[0], 'from isnt correct')
                to.should.equal(accounts[1], 'to isnt correct')
                tokens
                    .toString()
                    .should.equal(amount.toString(), 'tokens isnt correct')
            })
        })

        describe('failure', () => {
            let amount

            it('rejects insufficient balances', async () => {
                amount = tokens(10 ** 6 + 1)
                await token
                    .transfer(accounts[1], amount, {
                        from: accounts[0],
                    })
                    .should.be.rejectedWith(EVENT_REVERT)
            })

            it('rejects invalid recipients', async () => {
                amount = tokens(10)
                await token
                    .transfer('0x0', amount, {
                        from: accounts[0],
                    })
                    .should.be.rejectedWith('invalid address')
            })
        })
    })

    describe('approving tokens', () => {
        let amount
        let result

        beforeEach(async () => {
            amount = tokens(10)
            result = await token.approve(accounts[2], amount, {
                from: accounts[0],
            })
        })

        describe('success', () => {
            it('allocates an allowance for delegated token spending on exchange', async () => {
                const allowance = await token.allowance(
                    accounts[0],
                    accounts[2]
                )
                allowance.toString().should.equal(amount.toString())
            })

            it('emits a Approval event', () => {
                const [log] = result.logs
                const { event, args } = log
                const { tokenOwner, spender, tokens } = args
                event.should.equal('Approval')
                tokenOwner.should.equal(accounts[0], 'tokenOwner isnt correct')
                spender.should.equal(accounts[2], 'to isnt correct')
                tokens
                    .toString()
                    .should.equal(amount.toString(), 'tokens isnt correct')
            })
        })

        describe('failure', () => {
            it('rejects invalid spender', async () => {
                await token
                    .approve('0x0', amount, {
                        from: accounts[0],
                    })
                    .should.be.rejectedWith('invalid address')
            })
        })
    })

    describe('delegated tokens transfers', () => {
        let amount
        let result

        describe('success', () => {
            beforeEach(async () => {
                amount = tokens(100)
                await token.approve(accounts[2], amount, {
                    from: accounts[0],
                })

                result = await token.transferFrom(
                    accounts[0],
                    accounts[1],
                    amount,
                    {
                        from: accounts[2],
                    }
                )
            })

            it('transfer token allowance', async () => {
                const deployer = await token.balanceOf(accounts[0])
                const receiver = await token.balanceOf(accounts[1])

                deployer
                    .toString()
                    .should.equal(tokens(10 ** 6 - 100).toString())
                receiver.toString().should.equal(amount.toString())
            })

            it('reset allowance', async () => {
                const allowance = await token.allowance(
                    accounts[0],
                    accounts[2]
                )
                allowance.toString().should.equal('0')
            })

            it('emits a Transfer event', () => {
                const [log] = result.logs
                const { event, args } = log
                const { from, to, tokens } = args
                event.should.equal('Transfer')
                from.should.equal(accounts[0], 'from isnt correct')
                to.should.equal(accounts[1], 'to isnt correct')
                tokens
                    .toString()
                    .should.equal(amount.toString(), 'tokens isnt correct')
            })
        })

        describe('failure', () => {
            it('rejects insufficient allowance', async () => {
                amount = tokens(100)

                await token
                    .transferFrom(accounts[0], accounts[1], amount, {
                        from: accounts[2],
                    })
                    .should.be.rejectedWith(EVENT_REVERT)
            })
        })
    })
})
