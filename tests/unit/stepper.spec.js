import { expect } from 'chai'
import * as stepper from '@/ocha/stepper.js'
import * as ast from '@/ocha/ast-utils.js'
import * as printer from '@/ocha/printer.js'

describe('stepper.js', () => {
  it('should step simple reset.', () => {
    const target = ast.reset(3);
    expect(printer.printExpr(stepper.step([], target))).to.equal('3');
  })
})
