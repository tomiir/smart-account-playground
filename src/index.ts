import { tutorial1 } from "./tutorial-1"
import { tutorial2 } from "./tutorial-2"

const main = async () => {
  // await tutorial1()
  await tutorial2()
}

main().then(() => {
  console.log('All tutorials complete')
  process.exit(0)
})