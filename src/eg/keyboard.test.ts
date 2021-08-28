import rewire from "rewire"
const keyboard = rewire("./keyboard")
const cooldown = keyboard.__get__("cooldown")
// @ponicode
describe("cooldown", () => {
    test("0", () => {
        let callFunction: any = () => {
            cooldown()
        }
    
        expect(callFunction).not.toThrow()
    })
})
