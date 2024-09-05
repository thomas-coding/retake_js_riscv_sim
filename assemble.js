// simple assembler
//

// objs for different instruction types
function Jtype(){
    this.jumptarget = 0;
    this.opcode = 0;

    function set_from_tokens(instArr){
        // set fields from input and labels obj
        var cinst = Jfields[instArr[0]];
        this.jumptarget = instArr[1] & 0x01FFFFFF;
        this.opcode = cinst.opcode;
    }

    function to_bin(){
        // convert to binary
        var binned = 0;
        binned = binned | this.opcode;
        binned = binned | (this.jumptarget << 7);
        return binned;
    }

    this.set_from_tokens = set_from_tokens;
    this.to_bin = to_bin;
}

function LUItype(){
    this.rd = 0;
    this.LUIimm = 0;
    this.opcode = 0;

    function set_from_tokens(instArr){
        // set fields from input and labels obj
        var cinst = Lfields[instArr[0]];

        // set this.rd from input instruction
        this.rd = parseInt(instArr[1].replace( /^\D+/g, ""));

        // set this.LUIimm from input instruction
        this.LUIimm = parseInt(instArr[2]) & 0xFFFFF;

        this.opcode = cinst.opcode;
    }

    function to_bin(){
        // convert to binary
        var binned = 0;
        binned = binned | this.opcode;
        binned = binned | (this.LUIimm << 7);
        binned = binned | (this.rd << 27);
        return binned;
    }

    this.set_from_tokens = set_from_tokens;
    this.to_bin = to_bin;
}

function Itype(){
    this.rd = 0;
    this.rs1 = 0;
    this.imm = 0;
    this.funct3 = 0;
    this.opcode = 0;

    // set fields from input and labels obj
    function set_from_tokens(instArr){
        var cinst = Ifields[instArr[0]];

        // set this.rd from input instruction
        this.rd = parseInt(instArr[1].replace( /^\D+/g, ""));
 
        // set this.rs1
        if (cinst.specialrs1 != undefined){
            this.rs1 = cinst.specialrs1;
        } else if (cinst.opcode == 0x3){
            // special handling for load inst
            var rs1imm = instArr[2];
            rs1imm = rs1imm.replace(")", "");
            rs1imm = rs1imm.split("(")[1];
            this.rs1 = parseInt(rs1imm.replace( /^\D+/g, ""));
        } else {
            // process from input instruction
            this.rs1 = parseInt(instArr[2].replace( /^\D+/g, ""));
        }

        // set this.imm
        if (cinst.specialimm != undefined){
            // handle specialimms
            if (instArr[0] === "rdnpc"){
                this.imm = cinst.specialimm;
            } else {
                // handles slli, srli, srai 
                // shamt is 6 bits, but shamt[5] must equal 0
                var shamt = instArr[3] & 0x01F;
                this.imm = cinst.specialimm | shamt; 
            }
        } else if (cinst.opcode == 0x3){
            // special handling for load inst
            var rs1imm = instArr[2];
            rs1imm = rs1imm.replace(")", "");
            rs1imm = rs1imm.split("(")[0];
            this.imm = parseInt(rs1imm) & 0x0FFF; 
        } else {
            // process imm from input inst
            this.imm = parseInt(instArr[3]) & 0x0FFF;
        }

        this.funct3 = cinst.funct3;
        this.opcode = cinst.opcode;
    }

    function to_bin(){
        // convert to binary
        var binned = 0;
        binned = binned | this.opcode;
        binned = binned | (this.funct3 << 7);
        // TODO: edge cases with immediates / sign ext
        binned = binned | ((this.imm & 0x0FFF) << 10);
        binned = binned | (this.rs1 << 22);
        binned = binned | (this.rd << 27);
        return binned;
    }

    this.set_from_tokens = set_from_tokens;
    this.to_bin = to_bin;
}

function Btype(){
    this.rs1 = 0;
    this.rs2 = 0;
    this.imm = 0;
    this.funct3 = 0;
    this.opcode = 0;

    function set_from_tokens(instArr){
        // set fields from input and labels obj
        var cinst = Bfields[instArr[0]];

        this.opcode = cinst.opcode;
        this.funct3 = cinst.funct3;

        if (cinst.opcode == 0x63) {
            // handle conditional branches
            this.rs1 = parseInt(instArr[1].replace( /^\D+/g, ""));
            this.rs2 = parseInt(instArr[2].replace( /^\D+/g, ""));
            this.imm = instArr[3];
        } else if (cinst.opcode == 0x23) {
            // handle stores (note, special notation: sb x0, 0(x1))
            this.rs2 = parseInt(instArr[1].replace( /^\D+/g, ""));
            var rs1imm = instArr[2];
            rs1imm = rs1imm.replace(")", "");
            rs1imm = rs1imm.split("(");
            this.imm = parseInt(rs1imm[0]) & 0x0FFF; 
            this.rs1 = parseInt(rs1imm[1].replace( /^\D+/g, "")); 
        }
    }

    function to_bin(){
        // convert to binary
        var binned = 0;
        // handle splitting the immediate
        var imm12hi = this.imm >>> 7;
        var imm12lo = this.imm & 0x07F;
        binned = binned | this.opcode;
        binned = binned | (this.funct3 << 7);
        binned = binned | (imm12lo << 10);
        binned = binned | (this.rs2 << 17);
        binned = binned | (this.rs1 << 22);
        binned = binned | (this.imm12hi << 27);
        return binned;
    }

    this.set_from_tokens = set_from_tokens;
    this.to_bin = to_bin;
}

function Rtype(){
    this.rd = 0;
    this.rs1 = 0;
    this.rs2 = 0;
    this.funct10 = 0;
    this.opcode = 0;

    function set_from_tokens(instArr){
        // set fields from input and labels obj
        var cinst = Rfields[instArr[0]];

        // set rd,rs1,rs2 from input instruction
        this.rd = parseInt(instArr[1].replace( /^\D+/g, ""));
        this.rs1 = parseInt(instArr[2].replace( /^\D+/g, ""));
        this.rs2 = parseInt(instArr[3].replace( /^\D+/g, ""));

        // set funct10, opcode from cinst
        this.funct10 = cinst.funct10;
        this.opcode = cinst.opcode;
    }

    function to_bin(){
        // convert to binary
        var binned = 0;
        binned = binned | this.opcode;
        binned = binned | (this.funct10 << 7);
        binned = binned | (this.rs2 << 17);
        binned = binned | (this.rs1 << 22);
        binned = binned | (this.rd << 27);
        return binned;
    }

    this.set_from_tokens = set_from_tokens;
    this.to_bin = to_bin;
}

//TODO: need to implement this when the rest of the FP stuff is implemented
function R4type(){
    this.rd = 0;
    this.rs1 = 0;
    this.rs2 = 0;
    this.rs3 = 0;
    this.funct5 = 0;
    this.opcode = 0;

    function set_from_tokens(instArr){
        // set fields from input and labels obj

    }

    function to_bin(){
        // convert to binary
        var binned = 0;

        return binned;
    }

    this.set_from_tokens = set_from_tokens;
    this.to_bin = to_bin;
}


// assume that program will be loaded at 0x2000
function assemble(userProg){
    userProg = userProg.toLowerCase();
    userProg = userProg.split("\n");
    labels = {} //make this non-global after testing

    // First pass, process lines and calc labels
    // CURRENTLY DOES NOT HANDLE LABELS THAT ARE NOT ON SAME LINE AS INSTRUCTION
    for (var i = 0; i < userProg.length; i++){

        if (userProg[i].indexOf(":") != -1){
            // this line is a label
            l = userProg[i].replace(/: /g, ":");
            l = l.split(":");
            userProg[i] = l[1]; // put the actual instruction back
            l = l[0];
            l = l.replace(" ", ""); // cleanup any remaining spaces
            labels[l] = i; 
        }

        // handle ", " and ",", convert to " "
        userProg[i] = userProg[i].replace(/, /g, " ");
        userProg[i] = userProg[i].replace(/,/g, " ");

        userProg[i] = userProg[i].split(" ");
    }

    // second pass, assemble and fill in labels assuming start at 0x2000
    for (var i = 0; i < userProg.length; i++){
        // this line is an instruction
        makeObj = inst_to_type[userProg[i][0]];
        instObj = new makeObj();
        if ((makeObj === Btype) || (makeObj === Jtype)){
            var labelLoc = labels[userProg[i][userProg[i].length-1]];
            if (makeObj === Jtype){
                // if Jtype
                labelLoc = ((labelLoc|0) - (i|0))*4;
                labelLoc = labelLoc >>> 1;
                labelLoc = labelLoc & 0x01FFFFFF;
                userProg[i][userProg[i].length-1] = labelLoc;
            } else {
                // if Btype
                var cinst = Bfields[userProg[i][0]]; // need opcode
                if (cinst.opcode == 0x63) {
                    labelLoc = ((labelLoc|0) - (i|0))*4;
                    labelLoc = labelLoc >>> 1;
                    labelLoc = labelLoc & 0x0FFF;
                    userProg[i][userProg[i].length-1] = labelLoc;
                }
                // don't need to do anything special here for stores
            }
        }
        instObj.set_from_tokens(userProg[i]);
        userProg[i] = instObj.to_bin();
    }
    return userProg;
}
