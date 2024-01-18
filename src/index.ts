import { tutorialCustom } from "./tutorial-custom"
import { tutorial1 } from "./tutorial-1"
import { tutorial2 } from "./tutorial-2"
import { tutorial3 } from "./tutorial-3"

const main = async () => {
  // await tutorial1()
  // await tutorial2()
  // await tutorial3()
  await tutorialCustom()
}

main().then(() => {
  console.log('All tutorials complete')
  process.exit(0)
})