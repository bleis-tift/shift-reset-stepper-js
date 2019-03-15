import { expect } from 'chai'
import * as stepper from '@/ocha/stepper.js'
import * as ast from '@/ocha/ast-utils.js'
import * as printer from '@/ocha/printer.js'

describe('stepper.js', () => {
  for (const target of [10, ast.lambdaExpr([ast.astUnit()], 20)]) {
    it('should step value.', () => {
      expect(printer.printExpr(stepper.step([], target))).to.equal(printer.printExpr(target));
    })
  }

  it('should step function application.', () => {
    const target = ast.funApp(ast.lambdaExpr(['x'], 'x'), [3]);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })

  it('should step arg.', () => {
    const f = ast.funDef('f', [ast.astUnit()], 10);
    const target = ast.funApp(ast.lambdaExpr(['x'], 'x'), [ast.funApp('f', [ast.astUnit()])]);
    expect(printer.printExpr(stepper.step([f], target))).to.equal('(fun x -> x) ((fun () -> 10) ())');
  })

  it('should step simple reset.', () => {
    const target = ast.reset(3);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })
})
