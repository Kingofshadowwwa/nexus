import zlib
import math

def scroll_crc(STR):
    a = list(STR)
    out = []
    for i in a:
        b = ord(i)
        out.append(b)
    else:
        crc1 = []
        crc2 = []
        cor = 0
        while cor < (len(out)):
            if out[cor] %  2 ==0:
                crc1.append(out[cor])
                cor +=1
            else:
                crc2.append(out[cor])
                cor += 1
        crc1_crc = sum(crc1)
        crc2_crc = sum(crc2)
        crc1_crc = bytes(crc1_crc)
        crc2_crc = bytes(crc2_crc)
        crc_value1 = zlib.crc32(crc1_crc)
        crc_value2 = zlib.crc32(crc2_crc)
        lencrc =crc_value1 % 40
        lencrc1 =int((crc_value2 % 10000)/ 10)
        cor1 = 0
        resolut_out = [
        list(str(lencrc)),
        list(str(lencrc1))]

        return



scroll_crc('HELLO')