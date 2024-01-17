import { Hex } from "viem"
import { sepolia } from 'viem/chains'

export const allowedChains = [sepolia] as const
export type Chain = typeof allowedChains[number]

export type UrlConfig = {
  chain: Chain
  apiKey: string
}

export const ENTRYPOINT_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
}

export const RPC_URLS: Record<Chain['name'], string> = {
  Sepolia: "https://rpc.ankr.com/eth_sepolia",
}

export const publicRPCUrl = ({ chain }: { chain: Chain }) => RPC_URLS[chain.name]
export const paymasterUrl = ({ chain, apiKey }: UrlConfig) => `https://api.pimlico.io/v2/${chain.name.toLowerCase()}/rpc?apikey=${apiKey}`
export const bundlerUrl = ({ chain, apiKey }: UrlConfig) => `https://api.pimlico.io/v1/${chain.name.toLowerCase()}/rpc?apikey=${apiKey}`