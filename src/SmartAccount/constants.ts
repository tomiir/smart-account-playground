import { Hex } from "viem"
import { polygonMumbai, sepolia } from 'viem/chains'

// Types
export const allowedChains = [sepolia, polygonMumbai] as const
export type Chain = typeof allowedChains[number]
export type UrlConfig = {
  chain: Chain
  apiKey: string
}

// Entrypoints [I think this is constant but JIC]
export const ENTRYPOINT_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  'Polygon Mumbai': "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
}

// Paymasters 
// https://docs.pimlico.io/paymaster/erc20-paymaster/contract-addresses
export const PAYMASTER_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: "0x0000000000325602a77416A16136FDafd04b299f",
  'Polygon Mumbai': "0x000000000009B901DeC1aaB9389285965F49D387",
}

// USDC
export const USDC_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  'Polygon Mumbai': '0x9999f7fea5938fd3b1e26a12c3f2fb024e194f97'
}

// RPC URLs
export const RPC_URLS: Record<Chain['name'], string> = {
  Sepolia: "https://rpc.ankr.com/eth_sepolia",
  'Polygon Mumbai': "https://mumbai.rpc.thirdweb.com"
}

// Pimlico RPC names
export const PIMLICO_NETWORK_NAMES: Record<Chain['name'], string> = {
  Sepolia: "sepolia",
  'Polygon Mumbai': "mumbai"
}

export const publicRPCUrl = ({ chain }: { chain: Chain }) => RPC_URLS[chain.name]
export const paymasterUrl = ({ chain, apiKey }: UrlConfig) => `https://api.pimlico.io/v2/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`
export const bundlerUrl = ({ chain, apiKey }: UrlConfig) => `https://api.pimlico.io/v1/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`
