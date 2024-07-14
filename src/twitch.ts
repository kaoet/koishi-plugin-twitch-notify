
export interface ChannelInfo {
  name: string,
  displayName: string,
  profileImageURL: string,
  primaryColor: string,
  streaming: boolean,
  title: string,
  tags?: string[],
  game?: string,
  streamStartTime?: Date,
}

export async function fetchChannel(name: string): Promise<ChannelInfo> {
  const response = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
    },
    body: JSON.stringify([
      {
        "operationName": "ChannelShell",
        "variables": {
          "login": name,
        },
        "extensions": {
          "persistedQuery": {
            "version": 1,
            "sha256Hash": "580ab410bcd0c1ad194224957ae2241e5d252b2c5173d8e0cce9d32d5bb14efe"
          }
        }
      },
      {
        "operationName": "NielsenContentMetadata",
        "variables": {
          "isCollectionContent": false,
          "isLiveContent": true,
          "isVODContent": false,
          "collectionID": "",
          "login": name,
          "vodID": ""
        },
        "extensions": {
          "persistedQuery": {
            "version": 1,
            "sha256Hash": "2dbf505ee929438369e68e72319d1106bb3c142e295332fac157c90638968586"
          }
        }
      },
      {
        "operationName": "StreamTagsTrackingChannel",
        "variables": {
          "channel": name,
        },
        "extensions": {
          "persistedQuery": {
            "version": 1,
            "sha256Hash": "6aa3851aaaf88c320d514eb173563d430b28ed70fdaaf7eeef6ed4b812f48608"
          }
        }
      },
    ])
  });
  if (!response.ok) {
    throw Error(`HTTP status ${response.status}.`);
  }
  const root = await response.json();
  const channelShellUser = root[0]['data']['userOrError'];
  if ('userDoesNotExist' in channelShellUser) {
    throw Error(`User ${name} does not exist.`);
  }
  const metadataUser = root[1]['data']['user'];
  const result = {
    name,
    displayName: channelShellUser['displayName'],
    profileImageURL: channelShellUser['profileImageURL'],
    primaryColor: '#' + (channelShellUser['primaryColorHex'] ?? '9147FF'),
    streaming: channelShellUser['stream'] !== null,
    title: metadataUser['broadcastSettings']['title'],
  };
  const metadataStream = metadataUser['stream'];
  if (metadataStream !== null) {
    result['game'] = metadataStream['game']['displayName'];
    result['streamStartTime'] = new Date(metadataStream['createdAt']);
  }
  const tagsStream = root[2]['data']['user']['stream'];
  if (tagsStream !== null) {
    result['tags'] = tagsStream['freeformTags'].map((t: Object) => t['name']);
  }
  return result;
}