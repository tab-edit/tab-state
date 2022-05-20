type Group<Name extends string = string> = {
    name: Name
    export: string[]
    rules: string[] // TODO: maybe rename this "dependencies" and change purpose to storing only dependencies and export contains actually exported rules. this will mean we have to deal with making one single set from these though. we can cache to prevent inefficiency
}