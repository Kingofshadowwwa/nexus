
import time


def time_chat():
    current_time = time.time()
    local_time = time.localtime(current_time)

    formatted_time = time.strftime("%Y-%m-%d %H:%M:%S", local_time)
    return formatted_time