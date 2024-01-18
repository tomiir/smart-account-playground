import { Hex, createPublicClient, encodeFunctionData, http } from "viem"
import { Chain, USDC_ADDRESSES, PAYMASTER_ADDRESSES, publicRPCUrl } from "./constants"

const publicClient = ({ chain }: { chain: Chain }) => createPublicClient({
  transport: http(publicRPCUrl({ chain })),
})

export const approvePaymasterUSDCSpend = (chain: Chain) => {
  // Approve paymaster to spend USDC  on our behalf
  const approveData = approveUSDCSpendCallData({
    to: PAYMASTER_ADDRESSES[chain.name],
    amount: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
  })

  // GENERATE THE CALLDATA FOR USEROP TO SEND TO THE SMART ACCOUNT
  const dest = USDC_ADDRESSES[chain.name]  // Execute tx in USDC contract
  const value = 0n
  const data = approveData // Execute approve call

  return generateUserOperationExecuteCallData({ dest, value, data })
}

export const approveUSDCSpendCallData = ({ to, amount }: { to: Hex, amount: bigint }) => {
  return encodeFunctionData({
    abi: [
        {
          inputs: [
              { name: "_spender", type: "address" },
              { name: "_value", type: "uint256" }
          ],
          name: "approve",
          outputs: [{ name: "", type: "bool" }],
          payable: false,
          stateMutability: "nonpayable",
          type: "function"
        }
    ],
    args: [to, amount]
  })
}

// Wraps the call data in the execute function in order to send via UserOperation
export const generateUserOperationExecuteCallData = ({ dest, data, value }: { dest: Hex, data: Hex, value: bigint }) => {
  return encodeFunctionData({
    abi: [
        {
            inputs: [
                { name: "dest", type: "address" },
                { name: "value", type: "uint256" },
                { name: "func", type: "bytes" }
            ],
            name: "execute",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
        }
    ],
    args: [dest, value, data]
  })
}
  

export const getUSDCBalance = async ({ address, chain }: { address: Hex, chain: Chain }) => {
    return publicClient({ chain }).readContract({
      abi: [
          {
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
            stateMutability: "view"
          }
      ],
      address: USDC_ADDRESSES[chain.name],
      functionName: "balanceOf",
      args: [address]
  })
}