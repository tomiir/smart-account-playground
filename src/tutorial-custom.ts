import { Hex } from 'viem'
import SmartAccount from './SmartAccount'
import { polygonMumbai } from 'viem/chains'
import { generateUserOperationExecuteCallData, getUSDCBalance } from './SmartAccount/utils'
import { PAYMASTER_ADDRESSES } from './SmartAccount/constants'
import { waitForUserOperationReceipt } from 'permissionless'

const privateKey = process.env.PRIVATE_KEY as Hex

const chain = polygonMumbai

export const tutorialCustom = async () => {
  const smartAccount = new SmartAccount({ privateKey, chain })
  await sendTestTransaction(smartAccount)
  await sendTestTransactionWithSponsor(smartAccount)
}

const sendTestTransaction = async (smartAccount: SmartAccount) => {
  const account = await smartAccount.getAccount()
  console.log('Account address: ', account.address)

  console.log('Sending transaction...')
  const txHash = await smartAccount.sendTransactionWithUSDC({
    to: '0x13302Eb0aD9Af2F847119dC4Ac632fFe196d0B0f',
    value: 0n,
    data: '0x'
  })
  console.log('Transaction hash: ', txHash)
}

const sendTestTransactionWithSponsor = async (smartAccount: SmartAccount) => {
  // Check if the account has enough funds to sponsor the transaction
  const account = await smartAccount.getAccount()
  console.log(`Fetching USDC balance for address: ${account.address}`)
  const USDCBalance = await getUSDCBalance({ address: account.address, chain })
  console.log('USDC balance: ', USDCBalance)
  if (USDCBalance < 1_000_000n) {
    throw new Error(
      `insufficient USDC balance for counterfactual wallet address ${account.address}: ${
        Number(USDCBalance) / 1000000
      } USDC, required at least 1 USDC`
    )
  }

  const dest = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' // vitalik

  const transaction = await smartAccount.sendTransactionWithUSDC({
    to: dest,
    value: 0n,
    data: '0x'
  })

  console.log(transaction)
}
