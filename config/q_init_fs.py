bypass = ['q_init_fs.py', 'apn_cfg.json', 'system_config.json']

def list_dir(path):
    file_list = []

    for f in uos.ilistdir(path):
        if f[0] in bypass:
            continue
        else:
            new_f = {}
            if f[1] == 16384:
                new_f = {
                    'name': f[0],
                    'type': 'dir',
                    'size': '',
                    'path': path + '/' + f[0],
                    'sub': list_dir(path + '/' + f[0])
                }
            else:
                new_f = {
                    'name': f[0],
                    'type': 'file',
                    'size': str(f[3]) + ' B',
                    'path': path + '/' + f[0]
                }
            file_list.append(new_f)

    return file_list


temp = list_dir('/usr')
print(temp)
