import { Hex } from "viem"
import SmartAccount from "./SmartAccount"
import { sepolia } from "viem/chains"

const privateKey = process.env.PRIVATE_KEY as Hex

export const custom = async () => {
  console.log('------------------')
  console.log('Starting custom test')
  const smartAccount = new SmartAccount({ privateKey, chain: sepolia })
  await sendTestTransaction(smartAccount)
} 

const sendTestTransaction = async (smartAccount: SmartAccount) => {
  const account = await smartAccount.getAccount()
  console.log('Account address: ', account.address)

  console.log('Sending transaction...')
  const txHash = await smartAccount.sendTransaction({
    to: "0x13302Eb0aD9Af2F847119dC4Ac632fFe196d0B0f",
    value: 0n,
    data: "0x",
  })
  console.log('Transaction hash: ', txHash)
}
