export const EVENT_REVERT = 'VM Exception while processing transaction: revert'

export const ether = (n) => {
    return web3.utils.toBN(web3.utils.toWei(n.toString(), 'ether'))
}

export const tokens = (n) => ether(n)

export const ETHER_ADDRESS = `0x${Array(40).fill(0).join('')}`
