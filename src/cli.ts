import { Command } from "commander";

const program = new Command();

program
  .name("shipit")
  .description("一个使用commander.js的CLI示例")
  .version("0.0.2");
// .option('-v, --verbose', '输出详细日志信息')

program
  .command("greet <name>")
  .description("向某人问好")
  .option("-t, --title <title>", "添加称呼")
  .action((name, options) => {
    const greeting = `Hello, ${
      options.title ? options.title + " " : ""
    }${name}!`;
    console.log(greeting);
  });

program
  .command("calculate <numbers...>")
  .description("计算数字之和")
  .action((numbers) => {
    const sum = numbers.reduce(
      (acc: number, num: number) => acc + Number(num),
      0
    );
    console.log(`总和: ${sum}`);
  });
export { program };
